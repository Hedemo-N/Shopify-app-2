import type { NextApiRequest, NextApiResponse } from "next";
import "@shopify/shopify-api/adapters/node"; // 👈 ADD THIS LINE
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { supabase } from "../../frontend/lib/supabaseClient";


// Shopify client
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.July24,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  try {
    // 🧩 Dekoda session-token från App Bridge
    const payload = await shopify.session.decodeSessionToken(token);

    const shop = payload.dest.replace("https://", "");
    console.log("🔎 check-shop: decoded shop =", shop);

    // 🔍 Hämta user_id kopplad till butik (från shopify_shops)
    const user_id = await lookupUserByShop(shop);

    return res.status(200).json({ user_id });
  } catch (err) {
    console.error("❌ Token decoding error:", err);
    return res.status(401).json({ error: "Invalid session token" });
  }
}

// ----------------------------------------------------
// 🔥 ERSÄTTER dummyfunktionen med riktig Supabase-logik
// ----------------------------------------------------
async function lookupUserByShop(shop: string): Promise<string | null> {
  console.log("🔎 lookupUserByShop →", shop);

  const { data, error } = await supabase
    .from("profiles")
    .select("_id")
    .eq("shop", shop)
    .single();

  if (error) {
    console.warn("⚠️ Supabase lookup error:", error);
    return null;
  }

  return data?._id ?? null;
}
