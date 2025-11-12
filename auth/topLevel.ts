// app/auth/topLevel.ts
import express from "express";
const router = express.Router();

router.get("/auth/toplevel", (req, res) => {
  const { shop, host } = req.query;

  if (!shop || !host) {
    return res.status(400).send("Missing shop or host");
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Content-Type", "text/html");

  res.cookie("shopifyTopLevelOAuth", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  // 100 % Shopify-approved top-level redirect pattern
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
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
            "${process.env.SHOPIFY_APP_URL}/auth?shop=${shop}&host=${host}"
          );
        </script>
      </body>
    </html>
  `);
});

export default router;
