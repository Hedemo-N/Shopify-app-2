import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shop, host } = req.query;

  if (!shop || !host) {
    return res.status(400).send("Missing shop or host");
  }

  // 🍪 Sätt cookie (samma värden som Express)
  res.setHeader(
    "Set-Cookie",
    `shopifyTopLevelOAuth=1; Path=/; HttpOnly; Secure; SameSite=None`
  );

  console.log("🍪 Setting shopifyTopLevelOAuth cookie for", shop);

  // HTML-svar
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
      </head>
      <body>
        <script>
          const AppBridge = window['app-bridge'];
          const Redirect = AppBridge.actions.Redirect;

          const app = AppBridge.createApp({
            apiKey: "${process.env.SHOPIFY_API_KEY}",
            host: new URLSearchParams(window.location.search).get("host"),
          });

          Redirect.create(app).dispatch(
            Redirect.Action.REMOTE,
            "${process.env.SHOPIFY_APP_URL}/api/auth?shop=${shop}&host=${host}"
          );
        </script>
      </body>
    </html>
  `);
}
