// pages/login.tsx
export default function LoginPage() {
  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "auto" }}>
      <h1>Logga in</h1>
      <input id="email" placeholder="E-post" style={{ width: "100%", padding: 10 }} />
      <input id="password" placeholder="Lösenord" type="password" style={{ width: "100%", padding: 10 }} />
      <button style={{ width: "100%", marginTop: 12 }}>Logga in</button>
    </div>
  );
}
