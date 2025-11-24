// /api/onboarding-complete.ts
import express from "express";
import { supabase } from "../frontend/lib/supabaseClient.js";
import { verifySessionToken } from "./verifySessionToken.js";

const router = express.Router();

router.post("/onboarding-complete", verifySessionToken, async (req, res) => {
  const userId = req.user?.id;
  const { shop, email, phone, contact_name, company } = req.body;

  if (!userId || !shop) {
    return res.status(400).json({ error: "Missing user or shop" });
  }

  try {
    // Koppla användaren till shoppen
    const { error: updateError } = await supabase
      .from("shopify_shops")
      .update({ user_id: userId })
      .eq("shop", shop);

    if (updateError) throw updateError;

    // Skapa profilen
    const { error: insertError } = await supabase.from("profiles").insert({
      _id: userId,
      email,
      phone,
      company,
      contact_name,
      pris_ombud: 45,
      pris_hem2h: 99,
      pris_hemkvall: 65,
      number_box: 3,
    });

    if (insertError) throw insertError;

    console.log("✅ Onboarding klar för:", userId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Onboarding error:", err);
    res.status(500).json({ error: "Kunde inte slutföra onboarding" });
  }
});

export default router;
