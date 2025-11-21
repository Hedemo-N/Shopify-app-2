import express from "express";
import { supabase } from "../../supabaseClient.js";
import { verifySessionToken } from "../../middleware/verifySessionToken.js";

const router = express.Router();

router.post("/create-profile", verifySessionToken, async (req, res) => {
  try {
    const { email, phone, company, contact_name } = req.body;

    const userId = (req as any).user?.id; // 👈 bypassa TS här

    if (!userId) {
      return res.status(401).json({ error: "Ingen användare inloggad" });
    }

    const { error } = await supabase.from("profiles").upsert({
      _id: userId,
      email,
      phone,
      company,
      contact_name,
    });

    if (error) {
      console.error("❌ Error när profil skulle skapas:", error);
      return res.status(500).json({ error: "Kunde inte skapa profil" });
    }

    console.log("✅ Profil sparad för:", userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ create-profile error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
});

export default router;
