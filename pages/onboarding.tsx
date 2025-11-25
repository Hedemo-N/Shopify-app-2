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

    const token = await getSessionToken(app); // 🔥 viktigt

    const payload = {
      shop,
      host,
      ...form,
    };

    const res = await fetch("/api/onboarding-complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // 🔥 NYTT!
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push(`/?shop=${shop}&host=${host}`);
    } else {
      alert("Något gick fel. Kontakta support 🙏");
    }
  };

  return (
    <div style={{ padding: 30, maxWidth: 600, margin: "auto" }}>
      <h2>Välkommen till Blixt Delivery 🚀</h2>
      <form onSubmit={handleSubmit}>
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
        <button type="submit" style={{ marginTop: 12 }}>
          Fortsätt
        </button>
      </form>
    </div>
  );
}

export default dynamic(() => Promise.resolve(OnboardingPage), { ssr: false });
