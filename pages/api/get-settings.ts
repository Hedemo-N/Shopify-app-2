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
    // 👉 1. Validate Shopify token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = await shopify.session.decodeSessionToken(token);
    const shop = payload.dest.replace("https://", "").toLowerCase();

    // 👉 2. Load profile for this shop
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("shop", shop)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Shop not found in profiles" });

    // 👉 3. Return EXACT fields your form expects
    return res.status(200).json({
      success: true,
      settings: {
        // booleans
        erbjuda_ombud: data.erbjuda_ombud,
        erbjuda_hemleverans_express: data.erbjuda_hemleverans_express,
        erbjuda_hemleverans_kvall: data.erbjuda_hemleverans_kvall,

        // ombud
        pris_ombud: data.pris_ombud,
        cutoff_time_ombud: data.cutoff_time_ombud,
        number_box: data.number_box,

        // express
        pris_hem2h: data.pris_hem2h,

        // kväll
        pris_hemkvall: data.pris_hemkvall,
        cutoff_time_evening: data.cutoff_time_evening,

        // butiksinfo
        Butiksemail: data.Butiksemail,
        Butikstelefon: data.Butikstelefon,
        opening_hours: data.opening_hours,
        Butiksadress: data.Butiksadress,
      },
    });
  } catch (err) {
    console.error("get-settings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
