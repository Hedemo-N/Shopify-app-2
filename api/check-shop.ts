// pages/api/check-shop.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

// Ersätt med dina faktiska credentials
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: ["read_products"],
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.October23, // eller den du använder
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = await shopify.session.decodeSessionToken(token);
    const shop = payload.dest.replace("https://", "");

    // Här ersätter du med din databaslogik
    const user_id = await lookupUserByShop(shop);

    res.status(200).json({ user_id });
  } catch (err) {
    console.error("Token decoding error:", err);
    res.status(401).json({ error: "Invalid session token" });
  }
}

// Dummyfunktion – byt ut med Supabase eller riktig databas
async function lookupUserByShop(shop: string): Promise<string | null> {
  // TODO: Ersätt detta med riktig logik
  if (shop === "demo.myshopify.com") {
    return "user_abc123";
  }
  return null;
}
