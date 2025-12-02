import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";

function OnboardingPage() {
  const router = useRouter();
  const app = useAppBridge();

  const [shopReady, setShopReady] = useState(false);

  const shop = typeof router.query.shop === "string" ? router.query.shop : "";
const host = typeof router.query.host === "string" ? router.query.host : "";
const access_token = typeof router.query.token === "string" ? router.query.token : "";

  useEffect(() => {
    if (shop && host) {
      setShopReady(true);
    }
  }, [shop, host]);

  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shop || !host) {
      alert("shop eller host saknas – kan inte skicka formulär");
      return;
    }

    try {
      const token = await getSessionToken(app);

      const payload = {
        shop,
        host,
        access_token,
        ...form,
      };

      const res = await fetch("/api/send-onboarding-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log("✅ Onboarding skickad. Redirectar...");
        router.push(`/?shop=${shop}&host=${host}`);
      } else {
        const errorData = await res.json();
        console.error("API error:", errorData);
        alert(`Något gick fel: ${errorData.error || 'Okänt fel'}`);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Kunde inte skicka formuläret. Kontakta support 🙏");
    }
  };

  if (!shopReady) {
    return <p style={{ padding: 20 }}>🔄 Väntar på att shop & host ska laddas...</p>;
  }

  return (
    <div style={{ padding: 30, maxWidth: 500, margin: "auto" }}>
      <h2>Blixt Delivery – Onboarding 🚀</h2>
      <p style={{ marginBottom: 20 }}>
        Fyll i informationen nedan så kontaktar vi dig inom kort.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            id="company"
            placeholder="Företagsnamn"
            value={form.company}
            onChange={handleChange}
            required
          />
          <input
            id="contact"
            placeholder="Kontaktperson"
            value={form.contact}
            onChange={handleChange}
            required
          />
          <input
            id="email"
            placeholder="E-post"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            id="phone"
            placeholder="Telefonnummer"
            value={form.phone}
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            style={{
              marginTop: 16,
              padding: "10px 16px",
              background: "#0c80ff",
              color: "white",
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
              fontSize: 16,
            }}
          >
            Skicka
          </button>
        </div>
      </form>
    </div>
  );
}

export default dynamic(() => Promise.resolve(OnboardingPage), { ssr: false });
