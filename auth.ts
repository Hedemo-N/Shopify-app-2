import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { memorySessionStorage } from "./memorySessionStorage.js";
import { supabase } from "./supabaseClient.js";
import fetch from "node-fetch";

dotenv.config();

const router = express.Router();

// --- Shopify init ---
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: false,
  sessionStorage: memorySessionStorage,
});

// --- 1️⃣ Start auth flow ---
router.get("/auth", async (req, res) => {
  try {
    const shop = req.query.shop as string;
    if (!shop) return res.status(400).send("Missing shop parameter!");

    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    return res.redirect(authUrl);
  } catch (error) {
    console.error("❌ Error starting auth:", error);
    return res.status(500).send("Auth start failed");
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
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const accessToken = callback.session.accessToken!;
    const shop = callback.session.shop;

    console.log("✅ Auth success:");
    console.log("Shop:", shop);
    console.log("Access token:", accessToken);

    // --- Spara till Supabase ---
    const { data, error } = await supabase
      .from("shopify_shops")
      .upsert(
        {
          shop,
          access_token: accessToken,
          installed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "shop" }
      );

    if (error) console.error("❌ Supabase insert error:", error);
    else console.log("✅ Token sparad i Supabase:", data);

    // --- Registrera frakt-callback automatiskt ---
    await registerCarrier(shop, accessToken);

    // --- Registrera webhook för orderuppdatering (istället för create) ---
    const webhookResponse = await fetch(`https://${shop}/admin/api/2024-10/webhooks.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: {
          topic: "orders/updated",
          address: `${process.env.SHOPIFY_APP_URL}/api/webhooks/orders-create`,
          format: "json",
        },
      }),
    });

    const webhookData = await webhookResponse.json();
    console.log("🔔 Webhook registrerad (orders/updated):", webhookData);

    if (!res.headersSent) {
      return res.status(200).send("✅ App installerad, Blixt Delivery aktiv och webhook skapad!");
    }
  } catch (error) {
    console.error("❌ Auth callback error:", error);
    if (!res.headersSent) {
      res.status(500).send("Auth callback failed");
    }
  }
});

export default router;
