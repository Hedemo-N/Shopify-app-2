// app/auth.ts
import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import fetch from "node-fetch";
import { supabase } from "./supabaseClient.js";
interface ShopifyAccessTokenResponse {
  access_token?: string;
  scope?: string;
  associated_user?: {
    id: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

dotenv.config();
const router = express.Router();

// --- 1️⃣ Start OAuth flow ---
// --- 1️⃣ Start OAuth flow ---
router.get("/auth", async (req, res) => {
  try {
    const shop = req.query.shop as string;
    const host = req.query.host as string;

    if (!shop || !host) {
      return res.status(400).send("Missing shop or host");
    }

    // 🚧 Om ingen cookie => kör TopLevel-redirect
    if (!req.cookies["shopifyTopLevelOAuth"]) {
      console.log("🔁 Redirecting to top-level auth...");
      return res.redirect(`/auth/toplevel?shop=${shop}&host=${host}`);
    }
    // fortsätt annars med vanliga redirecten till Shopify OAuth...
console.log("✅ Cookie detected, proceeding with OAuth for", shop);

    // Skapa unik state (läggs direkt i URL, inte i cookies)
    const state = crypto.randomBytes(16).toString("hex");

    const redirectUri = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${process.env.SHOPIFY_APP_URL}/auth/callback&state=${state}`;
    console.log("🔗 Redirecting to Shopify OAuth:", redirectUri);

    return res.redirect(redirectUri);
  } catch (err) {
    console.error("❌ Auth start error:", err);
    return res.status(500).send("Auth start failed");
  } 
});

// --- 2️⃣ OAuth callback ---
router.get("/auth/callback", async (req, res) => {
  try {
    const { shop, code } = req.query;

    if (!shop || !code) {
      console.error("❌ Missing shop or code");
      return res.status(400).send("Missing params");
    }

    // ➤ 1. Byt code mot access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as ShopifyAccessTokenResponse;

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("❌ No access token in Shopify response", tokenData);
      return res.status(500).send("Token error");
    }

    console.log("🔑 Access token received:", accessToken);

    // ➤ 2. Hämta merchant user (associated_user)
    const userData = tokenData.associated_user;
    const merchantId = userData?.id ?? null;

    console.log("👤 Shopify associated_user id:", merchantId);

    // ➤ 3. Spara/uppdatera butik i Supabase
    const { error: upsertError } = await supabase
  .from("shopify_shops")
  .upsert({
    shop,
    access_token: accessToken,
    installed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
     user_id: merchantId, // 👈 Lägger till detta
  }, { onConflict: "shop" });


    if (upsertError) {
      console.error("❌ Failed to save shop:", upsertError);
    } else {
      console.log("💾 shopify_shops updated");
    }

    // ➤ 4. Registrera carrier API
    console.log("📦 Registering carrier service...");

    await fetch(`https://${shop}/admin/api/2024-10/carrier_services.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        carrier_service: {
          name: "Blixt Delivery",
          callback_url: `${process.env.SHOPIFY_APP_URL}/api/shipping-rates`,
          service_discovery: true,
        },
      }),
    });

    console.log("✅ Carrier registered");

    // ➤ 5. Skicka in användaren i appen
    res.send(`
      <html>
        <head>
          <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
        </head>
        <body>
          <script>
            const AppBridge = window['app-bridge'];
            const Redirect = AppBridge.actions.Redirect;

            const app = AppBridge.createApp({
              apiKey: "${process.env.SHOPIFY_API_KEY}",
              host: new URLSearchParams(window.location.search).get("host"),
            });

            Redirect.create(app).dispatch(
              Redirect.Action.APP,
              "/?shop=${shop}&host=" + new URLSearchParams(window.location.search).get("host")
            );
          </script>
        </body>
      </html>
    `);

  } catch (err) {
    console.error("❌ OAuth callback error:", err);
    res.status(500).send("OAuth failed");
  }
});
export default router;
