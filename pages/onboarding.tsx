// pages/onboarding.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";

function OnboardingPage() {
  const router = useRouter();
  const { shop, host } = router.query;
  const app = useAppBridge();

  const [submitting, setSubmitting] = useState(false); // NY STATE

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

    if (submitting) return; // Förhindra dubbla submits
    setSubmitting(true);

    try {
      const token = await getSessionToken(app);

      const payload = {
        shop,
        host,
        ...form,
      };

      console.log("📤 Skickar onboarding email...");

      const res = await fetch("/api/send-onboarding-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log("✅ Email skickad! Redirectar...");
        // Ge lite tid innan redirect så state hinner uppdateras
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push(`/pending-approval?shop=${shop}&host=${host}`);
      } else {
        const errorData = await res.json();
        console.error("API error:", errorData);
        alert(`Något gick fel: ${errorData.error || "Okänt fel"}`);
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Kunde inte skicka formuläret. Kontakta support 🙏");
      setSubmitting(false);
    }
  };

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
            disabled={submitting}
          />
          <input
            id="contact"
            placeholder="Kontaktperson"
            value={form.contact}
            onChange={handleChange}
            required
            disabled={submitting}
          />
          <input
            id="email"
            placeholder="E-post"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={submitting}
          />
          <input
            id="phone"
            placeholder="Telefonnummer"
            value={form.phone}
            onChange={handleChange}
            required
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              background: submitting ? "#ccc" : "#0c80ff",
              color: "white",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              borderRadius: 6,
              fontSize: 16,
            }}
          >
            {submitting ? "Skickar..." : "Skicka"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default dynamic(() => Promise.resolve(OnboardingPage), { ssr: false });