
// pages/onboarding.tsx
import { useRouter } from "next/router";

export default function OnboardingPage() {
  const router = useRouter();
  const { shop, host } = router.query;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      shop,
      host,
      company: (document.getElementById("company") as HTMLInputElement).value,
      contact: (document.getElementById("contact") as HTMLInputElement).value,
      email: (document.getElementById("email") as HTMLInputElement).value,
      phone: (document.getElementById("phone") as HTMLInputElement).value,
    };

    const res = await fetch("/api/onboarding-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        <input id="company" placeholder="Företagsnamn" required />
        <input id="contact" placeholder="Kontaktperson" required />
        <input id="email" placeholder="E-post" required />
        <input id="phone" placeholder="Telefonnummer" required />
        <button type="submit">Fortsätt</button>
      </form>
    </div>
  );
}