// pages/api/verifySessionToken.ts
import type { NextApiRequest, NextApiResponse } from "next";
import "@shopify/shopify-api/adapters/node"; // 👈 ADD THIS LINE
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: ["write_orders"],
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.October23,
});

export async function verifySessionToken(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return { ok: false };
  }

  try {
    const payload = await shopify.session.decodeSessionToken(token);

    return {
      ok: true,
      user: { id: payload.sub },     // ← Shopify user ID
      shop: payload.dest.replace("https://", "")
    };
  } catch (err) {
    console.warn("❌ Invalid session token:", err);
    return { ok: false };
  }
}
