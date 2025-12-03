import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shop, host } = req.query;

  console.log("🔥 /api/auth/toplevel HIT");
  console.log("📥 Query:", { shop, host });

  if (!shop || !host) {
    console.warn("❌ Missing params");
    return res.status(400).send("Missing shop or host");
  }

  // Sätt cookie med korrekt syntax
  res.setHeader(
    "Set-Cookie",
    "shopifyTopLevelOAuth=1; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=60"
  );

  console.log("🍪 Cookie set for", shop);

  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body>
        <p>Setting up authentication...</p>
        <script>
          console.log("🔄 Toplevel OAuth redirect starting...");
          
          const AppBridge = window['app-bridge'];
          const Redirect = AppBridge.actions.Redirect;

          const app = AppBridge.createApp({
            apiKey: "${process.env.SHOPIFY_API_KEY}",
            host: "${host}",
          });

          console.log("📡 Redirecting to /api/auth with cookie set");

          Redirect.create(app).dispatch(
            Redirect.Action.REMOTE,
            "${process.env.SHOPIFY_APP_URL}/api/auth?shop=${shop}&host=${host}"
          );
        </script>
      </body>
    </html>
  `);
}