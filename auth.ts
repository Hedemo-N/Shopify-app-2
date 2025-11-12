import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { supabase } from "./supabaseClient.js";
import fetch from "node-fetch";
import { customSessionStorage } from "./customSessionStorage.js";

dotenv.config();
const router = express.Router();

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage: customSessionStorage,
});

// --- 1️⃣ Start auth flow ---
router.get("/auth", async (req, res) => {
  const shop = req.query.shop as string;
  const host = req.query.host as string;

  if (!shop) return res.status(400).send("Missing shop parameter");

  // 📜 Skapa en enkel state-token som Shopify skickar tillbaka
  const state = Math.random().toString(36).substring(2, 15);
  console.log("🔑 Generated state:", state);

  try {
    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: true,
      rawRequest: req,
      rawResponse: res,
    });

    // ✨ Shopify kräver redirect, men vi lägger till state-parametern själva
    const redirectUrl = `${authUrl}&state=${state}`;
    console.log("🚀 Redirecting to:", redirectUrl);
    return res.redirect(redirectUrl);

  } catch (err: any) {
    console.error("❌ Error starting auth:", err);
    if (!res.headersSent) res.status(500).send("Auth start failed");
  }
});


// --- 2️⃣ Register shipping carrier ---
const registerCarrier = async (shop: string, token: string): Promise<void> => {
  try {
    const res = await fetch(`https://${shop}/admin/api/2024-10/carrier_services.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": token,
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

    const data = await res.json();
    console.log("📦 Carrier service registered:", data);
  } catch (err) {
    console.error("❌ Failed to register carrier:", err);
  }
};

// --- 3️⃣ Auth callback ---
router.get("/auth/callback", async (req, res) => {
  console.log("📩 CALLBACK HIT →", req.query);

  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    console.log("✅ shopify.auth.callback OK");

    const accessToken = callback.session.accessToken!;
    const shop = callback.session.shop;

    console.log("💾 Sparar token för:", shop);

    const { error } = await supabase
      .from("shopify_shops")
      .upsert({
        shop,
        access_token: accessToken,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "shop" });

    if (error) console.error("❌ Supabase insert error:", error);
    else console.log("✅ Token sparad");

    // --- Registrera frakt-callback ---
    await registerCarrier(shop, accessToken);

    // --- Redirect tillbaka till Shopify Admin ---
    console.log("🔁 Redirectar tillbaka in i Shopify Admin med App Bridge...");
    const host = req.query.host;
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
            Redirect.create(app).dispatch(Redirect.Action.APP, "/?shop=${shop}&host=${host}");
          </script>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error("❌ Auth callback error:", err.message);
    console.error("🧠 Stack trace:", err.stack || "Ingen stacktrace");
    if (!res.headersSent) res.status(500).send("Auth callback failed");
  }
});

export default router;
