import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../frontend/lib/supabaseClient";
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.July24,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    const payload = await shopify.session.decodeSessionToken(token);

    const shop = payload.dest.replace("https://", "");

    const updateData = { ...req.body };
    delete updateData.shop; // tas bort från update

    // 🔧 Uppdatera rätt rad i profiles
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("shop", shop);

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ update-settings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
