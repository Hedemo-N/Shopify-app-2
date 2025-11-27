import type { NextApiRequest, NextApiResponse } from "next";
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { supabase } from "../../frontend/lib/supabaseClient";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.July24,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) return res.status(401).json({ error: "Missing session token" });

    // 🔐 1. Validera session token
    const payload = await shopify.session.decodeSessionToken(token);
    const shop = payload.dest.replace("https://", "");

    // 🔎 2. Hämta profil via shop
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("shop", shop)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Shop not found in profiles" });
    }

    // 🟢 3. Returnera settings
    return res.status(200).json({
      success: true,
      settings: data,
    });
  } catch (err) {
    console.error("❌ get-settings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
