import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../frontend/lib/supabaseClient";
import crypto from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("✅ /api/auth/callback HIT");

  const { shop, code, host } = req.query;

  if (!shop || !code || !host) {
    return res.status(400).send("Missing params");
  }

  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return res.status(500).send("Token error");
  }

  const accessToken = tokenData.access_token;
  const merchantId = tokenData.associated_user?.id ?? null;

  await supabase
    .from("shopify_shops")
    .upsert(
      {
        shop,
        access_token: accessToken,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: merchantId,
      },
      { onConflict: "shop" }
    );

  await fetch(`https://${shop}/admin/api/2024-10/carrier_services.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      carrier_service: {
        name: "Blixt Delivery",
        callback_url: `${process.env.SHOPIFY_APP_URL}/api/shipping-rates`,
        service_discovery: true,
      },
    }),
  });

  // Redirect to embedded Shopify app
  res.send(`
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
            host: "${host}"
          });

          Redirect.create(app).dispatch(
            Redirect.Action.APP,
            "/?shop=${shop}&host=${host}"
          );
        </script>
      </body>
    </html>
  `);
}
