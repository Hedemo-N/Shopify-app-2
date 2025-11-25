import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../frontend/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    shop,
    erbjuda_ombud,
    erbjuda_hemleverans_express,
    erbjuda_hemleverans_kvall,
  } = req.body;

  // 🔍 Hämta user_id kopplat till shop
  const { data, error } = await supabase
    .from("shopify_shops")
    .select("user_id")
    .eq("shop", shop);

  if (error || !data || data.length !== 1) {
    return res.status(400).json({ error: "Shop not found or not unique" });
  }

  const userId = data[0].user_id;

  // 🔧 Uppdatera profilen
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      erbjuda_ombud,
      erbjuda_hemleverans_express,
      erbjuda_hemleverans_kvall,
    })
    .eq("id", userId);

  if (updateError) {
    return res.status(400).json({ error: updateError.message });
  }

  return res.status(200).json({ success: true });
}
