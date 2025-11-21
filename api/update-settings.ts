import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

router.post("/api/update-settings", async (req, res) => {
  const {
    shop,
    erbjuda_ombud,
    erbjuda_hemleverans_express,
    erbjuda_hemleverans_kvall,
  } = req.body;

  const { data, error } = await supabase
    .from("shopify_shops")
    .select("user_id")
    .eq("shop", shop);

  if (error || !data || data.length !== 1) {
    return res.status(400).json({ error: "Shop not found or not unique" });
  }

  const userId = data[0].user_id;

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

  res.json({ success: true });
});

export default router;
