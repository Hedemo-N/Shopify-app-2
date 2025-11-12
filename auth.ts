// app/auth.ts

import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { supabase } from "./supabaseClient.js";
import fetch from "node-fetch";
import crypto from "crypto";
import { customSessionStorage } from "./customSessionStorage.js";

dotenv.config();
const router = express.Router();

// --- Shopify init ---
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage: customSessionStorage,
});


// --- 1️⃣ Start OAuth utan cookie ---
router.get("/auth", async (req, res) => {
  const shop = req.query.shop as string;
  if (!shop) return res.status(400).send("Missing shop parameter");

  // generera unikt state-token
  const state = crypto.randomBytes(16).toString("hex");

  // spara det temporärt i memory eller Supabase om du vill (valfritt)
  req.app.locals[`state_${state}`] = { shop, created: Date.now() };

  // skapa Shopify OAuth URL manuellt
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${
    process.env.SHOPIFY_API_KEY
  }&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${
    process.env.SHOPIFY_APP_URL
  }/auth/callback&state=${state}`;

  console.log("🔗 Redirecting to Shopify OAuth:", authUrl);
  return res.redirect(authUrl);
});


// --- 2️⃣ Callback utan att kräva cookie ---
router.get("/auth/callback", async (req, res) => {
  try {
    const { shop, code, hmac, state } = req.query;

    if (!shop || !code || !hmac || !state) {
      return res.status(400).send("Missing required query params");
    }

    // verifiera HMAC enligt Shopify docs
    const params = new URLSearchParams(req.query as any);
    const hmacValue = params.get("hmac")!;
    params.delete("hmac");
    const message = params.toString();
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(message)
      .digest("hex");

    if (generatedHmac !== hmacValue) {
      console.warn("❌ Invalid HMAC");
      return res.status(400).send("Invalid HMAC");
    }

    // verifiera state
    const savedState = req.app.locals[`state_${state}`];
    if (!savedState || savedState.shop !== shop) {
      return res.status(400).send("Invalid or expired state");
    }

    // byt code mot access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    console.log("✅ Token received:", tokenData);

    // spara till Supabase
    await supabase.from("shopify_shops").upsert({
      shop,
      access_token: tokenData.access_token,
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // rensa state
    delete req.app.locals[`state_${state}`];

    // skicka tillbaka in i appen (embedded)
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
      <script>
        const AppBridge = window['app-bridge'];
        const Redirect = AppBridge.actions.Redirect;
        const app = AppBridge.createApp({
          apiKey: "${process.env.SHOPIFY_API_KEY}",
          host: new URLSearchParams(window.location.search).get("host"),
        });
        Redirect.create(app).dispatch(Redirect.Action.APP, "/?shop=${shop}");
      </script>
    `);
  } catch (error) {
    console.error("❌ Auth callback failed:", error);
    res.status(500).send("OAuth process failed");
  }
});

export default router;
