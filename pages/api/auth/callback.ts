import "@shopify/shopify-api/adapters/node";
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../frontend/lib/supabaseClient";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { randomUUID } from "crypto";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.October25,
  isEmbeddedApp: true,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🔥🔥🔥 CALLBACK ENDPOINT HIT 🔥🔥🔥");
  console.log("📥 Full query:", req.query);
  console.log("📥 Full URL:", req.url);

  const { shop, code, host } = req.query;

  if (!shop || !code || !host) {
    console.error("❌ Missing params:", { shop: !!shop, code: !!code, host: !!host });
    return res.status(400).send("Missing query params");
  }

  console.log("✅ All params present");
// ✅ LÄGG TILL HÄR - Kolla om session redan finns
const { data: existingSession } = await supabase
  .from("shopify_sessions")
  .select("access_token")
  .eq("shop", shop.toString().toLowerCase())
  .maybeSingle();

if (existingSession?.access_token) {
  console.log("✅ Session finns redan - skippar token exchange");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("shop")
    .eq("shop", shop.toString().toLowerCase())
    .maybeSingle();

  const redirectTarget = profile
    ? `/?shop=${shop}&host=${host}`
    : `/onboarding?shop=${shop}&host=${host}`;

  console.log("➡️ Redirect (existing session):", redirectTarget);

  return res.redirect(`https://admin.shopify.com/store/${shop.toString().replace('.myshopify.com', '')}/apps/blixt-delivery${redirectTarget}`);
}

console.log("✅ All params present");
  // ---- EXCHANGE TEMP CODE FOR ACCESS TOKEN ----
  console.log("🔄 Exchanging code for access_token...");
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
  console.log("🔐 Token response status:", tokenResponse.status);

  if (!tokenData.access_token) {
    console.error("❌ No access_token in response:", tokenData);
    return res.status(500).send("Token exchange failed");
  }

  const accessToken = tokenData.access_token;
  console.log("✅ Got access_token:", accessToken.substring(0, 10) + "...");

  // ---- SAVE TO shopify_sessions ----
  console.log("💾 Attempting to save to shopify_sessions...");
  
  const dataToInsert = {
    id: randomUUID(),
    shop: shop.toString().toLowerCase(),
    host: host.toString(),
    access_token: accessToken,
    session: JSON.stringify({ shop, host, accessToken }), // Lägg till session field
  };

  console.log("📦 Data to insert:", {
    shop: dataToInsert.shop,
    host: dataToInsert.host,
    access_token: dataToInsert.access_token.substring(0, 10) + "...",
  });

  const { data: sessionData, error: sessionError } = await supabase
    .from("shopify_sessions")
    .upsert(dataToInsert, { onConflict: "shop" })
    .select();

  if (sessionError) {
    console.error("❌❌❌ SUPABASE ERROR:", sessionError);
    console.error("Error details:", JSON.stringify(sessionError, null, 2));
  } else {
    console.log("✅✅✅ SAVED TO SUPABASE:", sessionData);
  }

  // ---- CHECK IF PROFILE EXISTS ----
  console.log("🔍 Checking if profile exists...");
  const { data: profile } = await supabase
    .from("profiles")
    .select("_id")
    .eq("shop", shop.toString().toLowerCase())
    .maybeSingle();

  const redirectTarget = profile
    ? `/?shop=${shop}&host=${host}`
    : `/onboarding?shop=${shop}&host=${host}`;

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
    console.error("❌ CarrierService error:", err);
  }

  // ---- REDIRECT ----
  const shopName = shop.toString().replace('.myshopify.com', '');
  const redirectUrl = `https://admin.shopify.com/store/${shopName}/apps/blixt-delivery${redirectTarget}`;
  console.log("➡️ Final redirect to:", redirectUrl);
  return res.redirect(redirectUrl);
}
