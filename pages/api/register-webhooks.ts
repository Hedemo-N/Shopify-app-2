import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "frontend/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shop } = req.body;

  if (!shop) {
    return res.status(400).json({ error: "Missing shop parameter" });
  }

  console.log("🪝 Registering webhooks for shop:", shop);

  // Hämta access_token från shopify_sessions
  const { data: session, error: sessionError } = await supabase
    .from("shopify_sessions")
    .select("access_token")
    .eq("shop", shop.toLowerCase())
    .single();

  if (sessionError || !session?.access_token) {
    console.error("❌ Could not find access_token:", sessionError);
    return res.status(404).json({ error: "No access token found for shop" });
  }

  const accessToken = session.access_token;

  // Lista över webhooks att registrera
  const webhooksToRegister = [
    {
      topic: "orders/create",
      address: `${process.env.SHOPIFY_APP_URL}/api/webhooks/orders-create`,
    },
  ];

  const results = [];

  for (const webhook of webhooksToRegister) {
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

      const result = await response.json();
      console.log(`🪝 ${webhook.topic} response:`, result);
      
      results.push({
        topic: webhook.topic,
        success: !result.errors,
        result,
      });
    } catch (err) {
      console.error(`❌ Error registering ${webhook.topic}:`, err);
      results.push({
        topic: webhook.topic,
        success: false,
        error: String(err),
      });
    }
  }

  return res.status(200).json({ 
    message: "Webhook registration complete",
    results 
  });
}