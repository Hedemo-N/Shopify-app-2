import express from "express";
import { supabase } from "../supabaseClient.js";
import crypto from "crypto";
import { shopifyApi } from "@shopify/shopify-api";
import { customSessionStorage } from "../customSessionStorage.js";
import { ApiVersion } from "@shopify/shopify-api";

const router = express.Router();

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SHOPIFY_SCOPES.split(","),
  hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.July23, // ✅ eller ApiVersion.January24, beroende på vad du har installerat
  sessionStorage: customSessionStorage,
});

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

    // 2. Hämta shop info från Shopify (namn m.m.)
    const session = await shopify.sessionStorage.loadByShop(shop);
    if (!session) {
      console.error("❌ Ingen session hittades för shop:", shop);
      return res.status(500).send("Missing Shopify session");
    }

    const shopInfo = await shopify.rest.Shop.all({ session });
    const butikNamn = shopInfo.data[0]?.name || null;

    // 3. Skapa profile inkl butik_namn
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      phone,
      company,
      contact_name: contact,
      display_name: butikNamn, // <-- här sätter vi butiksnamnet
    });

    if (profileError) {
      console.error("❌ Profile upsert error:", profileError);
      return res.status(500).send("Profile failed");
    }

    // 4. Koppla shopify_shops.user_id
    const { error: linkError } = await supabase.from("shopify_shops")
      .update({ user_id: userId })
      .eq("shop", shop);

    if (linkError) {
      console.error("❌ shopify_shops update error:", linkError);
      return res.status(500).send("Failed to link shop");
    }

    console.log("🔗 Shop connected to user:", userId);
    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Onboarding error:", err);
    return res.status(500).send("Server error");
  }
});

export default router;
