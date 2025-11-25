// pages/login.tsx
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = { email, password };

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      alert("Fel inloggning. Försök igen.");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "auto" }}>
      <h1>Logga in på blixten test</h1>
      <form onSubmit={handleSubmit}>
        <input
          id="email"
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        /> 
        <input
          id="password"
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        />
        <button type="submit" style={{ width: "100%", padding: 10 }}>
          Logga in
        </button>
      </form>

      <div style={{ marginTop: 30, textAlign: "center" }}>
        <p>Inget konto ännu?</p>
        <a
          href="mailto:support@dittbolag.se"
          style={{ color: "#0070f3", textDecoration: "underline" }}
        >
          Kontakta oss så hjälper vi dig igång
        </a>
      </div>
    </div>
  );
}
