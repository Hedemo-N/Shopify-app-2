import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "frontend/lib/supabaseClient";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("➡️ /api/register-webhooks handler called", { method: req.method, body: req.body });

  if (req.method !== "POST") {
    console.log("⛔ Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shop } = req.body || {};

  console.log("➡️ Extracted shop from body:", shop);

  if (!shop) {
    console.error("❌ Missing shop parameter!");
    return res.status(400).json({ error: "Missing shop parameter" });
  }

  // ===== Fetch token =====
  console.log("➡️ Fetching access_token from supabase for shop:", shop);

  const { data: session, error: sessionError } = await supabase
    .from("shopify_sessions")
    .select("access_token")
    .eq("shop", shop.toLowerCase())
    .single();

  console.log("➡️ Supabase result:", { session, sessionError });

  if (sessionError || !session?.access_token) {
    console.error("❌ Could not find access_token for shop:", shop, sessionError);
    return res.status(404).json({ error: "No access token found for shop" });
  }

  const accessToken = session.access_token;
  console.log("🗝️ Using access token:", accessToken);

  // ===== Let's test that token with Shopify API =====
  try {
    const testResponse = await fetch(
      `https://${shop}/admin/api/2025-10/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("➡️ Shopify /shop.json status:", testResponse.status);
    const testBody = await testResponse.text();
    console.log("➡️ Shopify /shop.json body:", testBody);
  } catch (err) {
    console.error("❌ Failed test call to Shopify /shop.json:", err);
  }

  // ===== Register webhooks one by one =====
  const webhooksToRegister = [
    {
      topic: "orders/create",
      address: `${process.env.SHOPIFY_APP_URL}/api/webhooks/orders-create`,
    },
  ];

  const results = [];

  for (const webhook of webhooksToRegister) {
    console.log("➡️ About to register webhook:", webhook);

    try {
      console.log(`📡 Registering ${webhook.topic}...`);

      const response = await fetch(
        `https://${shop}/admin/api/2025-10/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: {
              topic: webhook.topic,
              address: webhook.address,
              format: "json",
            },
          }),
        }
      );

      console.log(`➡️ Shopify webhook POST status for ${webhook.topic}:`, response.status);

      const result = await response.json();
      console.log(`🪝 Shopify response for ${webhook.topic}:`, result);

      results.push({
        topic: webhook.topic,
        success: !result.errors,
        result,
      });
    } catch (err) {
      console.error(`❌ Error registering webhook ${webhook.topic}:`, err);
      results.push({
        topic: webhook.topic,
        success: false,
        error: String(err),
      });
    }
  }

  console.log("📦 Final webhook registration results:", results);

  return res.status(200).json({ 
    message: "Webhook registration complete",
    results 
  });
}
