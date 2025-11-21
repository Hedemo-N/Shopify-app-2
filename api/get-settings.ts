import express from "express";
import { supabase } from "../supabaseClient.ts";
import { verifySessionToken } from "../middleware/verifySessionToken.ts";

const router = express.Router();

// ⬇️ Lägg till middleware här
router.post("/api/get-settings", verifySessionToken, async (req, res) => {
  const { shop } = req.body;

  const { data: shopRow, error: shopErr } = await supabase
    .from("shopify_shops")
    .select("user_id")
    .eq("shop", shop)
    .single();

  if (shopErr || !shopRow) return res.status(400).json({ error: "Shop not found" });

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("erbjuda_ombud, erbjuda_hemleverans_express, erbjuda_hemleverans_kvall")
    .eq("id", shopRow.user_id)
    .single();

  if (profErr) return res.status(400).json({ error: profErr.message });

  res.json(profile);
});
