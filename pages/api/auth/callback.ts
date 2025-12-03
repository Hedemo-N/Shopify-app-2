// pages/api/auth/callback.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../frontend/lib/supabaseClient";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

// Shopify client
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.October25,
  isEmbeddedApp: true,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🔥 /api/auth/callback HIT");

  const { shop, code, host } = req.query;

  if (!shop || !code || !host) {
    return res.status(400).send("Missing query params");
  }

  // ---- EXCHANGE TEMP CODE FOR ACCESS TOKEN ----
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
    console.error("❌ Missing access_token:", tokenData);
    return res.status(500).send("Token exchange failed");
  }

  const accessToken = tokenData.access_token;

  // ---- SAVE SHOP IN DB ----
  await supabase.from("shopify_sessions").upsert(
  {
    shop: shop.toString().toLowerCase(),
    host: host.toString(),
    access_token: accessToken,
    installed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  { onConflict: "shop" } // ✅ korrekt: sträng
);


  console.log("💾 Saved shop:", shop);

  // ---- CHECK IF PROFILE EXISTS TO DECIDE REDIRECT ----
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("shop", shop.toString().toLowerCase())
    .maybeSingle();

  const redirectTarget = profile
    ? `/?shop=${shop}&host=${host}`         // ADMIN
    : `/onboarding?shop=${shop}&host=${host}`; // FIRST TIME

  console.log("➡️ Redirecting to:", redirectTarget);

  // ---- REGISTER CARRIER SERVICE ----
  try {
    console.log("📡 Registering CarrierService...");

    const register = await fetch(
      `https://${shop}/admin/api/2025-10/carrier_services.json`,
      {
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
      }
    );

    const result = await register.json();
    console.log("🚚 CarrierService response:", result);

  } catch (err) {
    console.error("❌ CarrierService registration failed:", err);
  }

  // ---- EMBEDDED REDIRECT ----
  res.send(`
    <html>
      <head>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>

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
            "${redirectTarget}"
          );
        </script>
      </body>
    </html>
  `);
}
