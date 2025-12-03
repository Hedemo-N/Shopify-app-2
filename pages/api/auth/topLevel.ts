import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const shop = req.query.shop as string;
  const host = req.query.host as string;

  console.log("🔥 /api/auth/toplevel HIT");
  console.log("📥 Query:", { shop, host });

  if (!shop) {
    console.warn("❌ Missing shop");
    return res.status(400).send("Missing shop parameter");
  }

  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
      </head>
      <body>
        <p>Redirecting to authentication...</p>
        <script>
          console.log("🔄 Toplevel OAuth redirect");
          
          // Hämta host från URL om den inte finns i query
          const urlParams = new URLSearchParams(window.location.search);
          const hostParam = urlParams.get("host") || "${host || ''}";
          const shopParam = "${shop}";

          if (!hostParam) {
            console.warn("⚠️ No host found, redirecting to parent");
            window.top.location.href = "https://" + shopParam + "/admin/apps";
          } else {
            const AppBridge = window['app-bridge'];
            const Redirect = AppBridge.actions.Redirect;

            const app = AppBridge.createApp({
              apiKey: "${process.env.SHOPIFY_API_KEY}",
              host: hostParam,
            });

            console.log("📡 Redirecting to /api/auth");

            Redirect.create(app).dispatch(
              Redirect.Action.REMOTE,
              "${process.env.SHOPIFY_APP_URL}/api/auth?shop=" + shopParam + "&host=" + hostParam
            );
          }
        </script>
      </body>
    </html>
  `);
}