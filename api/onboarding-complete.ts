import express from "express";
import { supabase } from "../supabaseClient.js";
import crypto from "crypto";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { customSessionStorage } from "../customSessionStorage.js";

// ✅ Kontrollera att alla miljövariabler finns INNAN du använder dem
if (
  !process.env.SHOPIFY_API_KEY ||
  !process.env.SHOPIFY_API_SECRET ||
  !process.env.SHOPIFY_SCOPES ||
  !process.env.SHOPIFY_APP_URL
) {
  throw new Error("❌ Saknar SHOPIFY_* variabler i .env");
}

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES;
const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL;

const shopify = shopifyApi({
  apiKey: SHOPIFY_API_KEY,
  apiSecretKey: SHOPIFY_API_SECRET,
  scopes: SHOPIFY_SCOPES.split(","),
  hostName: SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.July23,
  sessionStorage: customSessionStorage,
});

const router = express.Router();

router.post("/onboarding-complete", async (req, res) => {
  try {
    const { shop, company, contact, email, phone } = req.body;

    if (!shop || !email) return res.status(400).send("Missing required fields");

    console.log("🟦 Completing onboarding for:", shop);

    // 1. Skapa auth-användare
    const password = crypto.randomBytes(8).toString("hex");
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authUser?.user?.id) {
      console.error("❌ Auth create error:", authError);
      return res.status(500).send("Auth failed");
    }

    const userId = authUser.user.id;
    console.log("👤 Skapade Supabase-användare:", userId);

   // 2. Hämta butikens namn från Shopify
const session = await customSessionStorage.loadSession(shop); // använd din egen storage direkt
if (!session) {
  console.error("❌ Ingen session hittades för shop:", shop);
  return res.status(500).send("Missing Shopify session");
}

const client = new shopify.rest.RestClient(session.shop, session.accessToken);
const shopInfo = await client.get({ path: "/shop" });
const butikNamn = shopInfo?.body?.shop?.name ?? null;


    console.log("🏪 Butiksnamn från Shopify:", butikNamn);

    // 3. Skapa profil med namn
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      phone,
      company,
      contact_name: contact,
      display_name: butikNamn,
    });

    if (profileError) {
      console.error("❌ Kunde inte spara profil:", profileError);
      return res.status(500).send("Profile failed");
    }

    // 4. Koppla Shopify-shop till user_id
    const { error: linkError } = await supabase
      .from("shopify_shops")
      .update({ user_id: userId })
      .eq("shop", shop);

    if (linkError) {
      console.error("❌ Kunde inte koppla shopify_shops:", linkError);
      return res.status(500).send("Failed to link shop");
    }

    console.log("🔗 Kopplade shop → user:", userId);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Onboarding error:", err);
    return res.status(500).send("Server error");
  }
});

export default router;
