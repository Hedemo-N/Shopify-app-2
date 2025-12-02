import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../frontend/lib/supabaseClient";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.October25,
  isEmbeddedApp: true,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🔥 [callback] Endpoint HIT");

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const { shop, code, host } = req.query;
  console.log("📥 Query params:", { shop, code, host });

  if (!shop || !code || !host) {
    console.warn("⚠️ Saknas query-parametrar");
    return res.status(400).send("Missing query params");
  }

  const shopLower = shop.toString().toLowerCase();

  // ---- EXCHANGE TEMP CODE FOR ACCESS TOKEN ----
  console.log("🔄 Försöker byta kod mot access_token...");
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
  console.log("🔐 Token response:", JSON.stringify(tokenData, null, 2));

  if (!tokenData.access_token) {
    console.error("❌ Ingen access_token mottagen:", tokenData);
    return res.status(500).send("Token exchange failed");
  }

  const accessToken = tokenData.access_token;
  console.log("✅ access_token mottagen:", accessToken);

  // ---- CHECK IF SHOP EXISTS IN SUPABASE ----
  console.log("🔍 Kollar om shop finns i Supabase...");
  const { data: existingShop, error: lookupError } = await supabase
    .from("profiles")
    .select("_id, shop, access_token_shopify")
    .eq("shop", shopLower)
    .maybeSingle();

  if (lookupError) {
    console.error("❌ Supabase lookup error:", lookupError);
  }

  let redirectTarget = "";

  if (existingShop) {
    // ---- SHOP EXISTS - UPDATE TOKEN AND GO TO DASHBOARD ----
    console.log("✅ Shop finns redan i Supabase. Uppdaterar token...");
    
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        access_token_shopify: accessToken,
        host: host.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("shop", shopLower);

    if (updateError) {
      console.error("❌ Fel vid uppdatering av token:", updateError);
    } else {
      console.log("✅ Token uppdaterad i Supabase");
    }

    redirectTarget = `/?shop=${shop}&host=${host}`;
    console.log("➡️ Shop finns - redirectar till dashboard");

  } else {
    // ---- NEW SHOP - GO TO ONBOARDING ----
    console.log("⚠️ Shop finns INTE i Supabase. Skickar till onboarding...");
    redirectTarget = `/onboarding?shop=${shop}&host=${host}&token=${accessToken}`;
    console.log("➡️ Ny shop - redirectar till onboarding med token");
  }

  // ---- REGISTER CARRIER SERVICE ----
  try {
    console.log("📡 Försöker registrera CarrierService...");

    const register = await fetch(`https://${shop}/admin/api/2025-10/carrier_services.json`, {
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

    const result = await register.json();
    console.log("🚚 CarrierService response:", result);
  } catch (err) {
    console.error("❌ Fel vid CarrierService-registrering:", err);
  }

  // ---- CLEAN UP COOKIE ----
  console.log("🧹 Rensar ShopifyTopLevelOAuth-cookie");
  res.setHeader(
    "Set-Cookie",
    `shopifyTopLevelOAuth=; Path=/; HttpOnly; Secure; SameSite=None; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );

  // ---- EMBEDDED REDIRECT ----
  console.log("➡️ Redirectar till:", redirectTarget);

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