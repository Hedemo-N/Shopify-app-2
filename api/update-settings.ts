import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

router.post("/api/update-settings", async (req, res) => {
  const { shop, erbjuda_ombud, erbjuda_hemleverans_express, erbjuda_hemleverans_kvall } = req.body;

  const { data: shopRow } = await supabase
    .from("shopify_shops")
    .select("user_id")
    .eq("shop", shop)
    .single();

  if (!shopRow) return res.status(400).json({ error: "Shop not found" });

  const { error } = await supabase
    .from("profiles")
    .update({
      erbjuda_ombud,
      erbjuda_hemleverans_express,
      erbjuda_hemleverans_kvall,
    })
    .eq("id", shopRow.user_id);

  if (error) return res.status(400).json({ error });

  res.json({ success: true });
});

export default router;
