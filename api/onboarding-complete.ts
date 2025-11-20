import express from "express";
import { supabase } from "../supabaseClient.js";
import crypto from "crypto";

const router = express.Router();

router.post("/onboarding-complete", async (req, res) => {
  try {
    const { shop, company, contact, email, phone } = req.body;

    if (!shop) return res.status(400).send("Missing shop");

    console.log("🟦 Completing onboarding for:", shop);

    // 1. Skapa Auth user (service role key krävs)
    const password = crypto.randomBytes(8).toString("hex");

    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("❌ Auth create error:", authError);
      return res.status(500).send("Auth failed");
    }

    const userId = authUser.user.id;

    console.log("👤 Created Supabase user:", userId);

    // 2. Skapa profile
    await supabase.from("profiles").upsert({
      id: userId,
      email,
      phone,
      company,
      contact_name: contact,
    });

    // 3. Koppla shopify_shops.user_id
    await supabase.from("shopify_shops")
      .update({ user_id: userId })
      .eq("shop", shop);

    console.log("🔗 Shop connected to user:", userId);

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Onboarding error:", err);
    return res.status(500).send("Server error");
  }
});

export default router;
