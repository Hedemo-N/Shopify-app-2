import express from "express";
import { supabase } from "../supabaseClient.ts";
import { verifySessionToken } from "../middleware/verifySessionToken.ts";

const router = express.Router();

router.post("/api/get-settings", verifySessionToken, async (req, res) => {
  const { shop } = req.body;

  const { data: shops, error } = await supabase
    .from("shopify_shops")
    .select("user_id")
    .eq("shop", shop);

  if (error || !shops || shops.length !== 1) {
    return res.status(400).json({ error: "Shop not found or not unique" });
  }

  const userId = shops[0].user_id;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("erbjuda_ombud, erbjuda_hemleverans_express, erbjuda_hemleverans_kvall")
    .eq("id", userId)
    .single();

  if (profErr) {
    return res.status(400).json({ error: profErr.message });
  }

  res.json(profile);
});

export default router;
