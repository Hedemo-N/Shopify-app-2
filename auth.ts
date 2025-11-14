// app/auth.ts
import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import fetch from "node-fetch";
import { supabase } from "./supabaseClient.js";

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
    const { shop, code, state } = req.query;

    console.log("📩 Callback hit with query:", req.query);

    if (!shop || !code) {
      console.error("❌ Missing shop or code in callback");
      return res.status(400).send("Missing required params");
    }

    console.log("🔑 Requesting access token...");

    // --- Utbyt code mot permanent access token ---
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

   const text = await tokenResponse.text();
console.log("🔍 Raw token response:", text);

let accessToken: string | undefined;
try {
  const tokenData = JSON.parse(text) as { access_token?: string; error?: any };
  if (!tokenData.access_token) {
    console.error("❌ No access_token in response:", tokenData);
    return res.status(500).send("Shopify did not return an access_token");
  }
  accessToken = tokenData.access_token;
  console.log("✅ Access token received for:", shop);
} catch (err) {
  console.error("❌ Could not parse Shopify token response (likely HTML):", err);
  return res.status(500).send("Invalid token response from Shopify");
}


    console.log("✅ Access token received for:", shop);

    // --- Spara token i Supabase ---
    const { error } = await supabase.from("shopify_shops").upsert(
      {
        shop,
        access_token: accessToken,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "shop" }
    );

    if (error) {
      console.error("❌ Supabase save error:", error);
    } else {
      console.log("💾 Token saved to Supabase for:", shop);
    }

    // --- Registrera carrier service ---
    console.log("📦 Registering carrier service...");
    const carrierRes = await fetch(`https://${shop}/admin/api/2024-10/carrier_services.json`, {
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
    const carrierData = await carrierRes.json();
    console.log("✅ Carrier service response:", carrierData);


    console.log("📬 Registering order create webhook...");

await fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, {
  method: "POST",
  headers: {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    webhook: {
      topic: "orders/create",
      address: `${process.env.SHOPIFY_APP_URL}/api/webhooks/orders-create`,
      format: "json"
    }
  })
}).then(r => r.json()).then(d => console.log("📬 Webhook result:", d));

    // --- Avsluta: skicka in användaren i appen ---
    console.log("🔁 Redirecting back into Shopify Admin iframe...");

    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
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
  } catch (error) {
    console.error("❌ Auth callback error:", error);
    if (!res.headersSent) res.status(500).send("Auth callback failed");
  }
});

export default router;
