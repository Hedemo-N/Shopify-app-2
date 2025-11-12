// app/auth.ts
import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { supabase } from "./supabaseClient.js";
import fetch from "node-fetch";
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

// --- 1️⃣ Start auth flow ---
router.get("/auth", async (req, res) => {
  const shop = req.query.shop as string;
  const host = req.query.host as string;
  const embedded = req.query.embedded === "1";

  console.log("🧭 /auth startad →", { shop, host, embedded });

  if (!shop) return res.status(400).send("Missing shop parameter");

  // 👀 Om appen körs inuti Shopify Admin (iframe)
  if (embedded) {
    console.log("🪟 Upptäckt iframe – laddar utanför för OAuth...");
    return res.send(`
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            console.log("🪟 Leaving iframe for top-level OAuth...");
            window.top.location.href = "${process.env.SHOPIFY_APP_URL}/auth?shop=${shop}&host=${host}";
          </script>
        </body>
      </html>
    `);
  }

  // 🍪 Om cookien inte finns – hoppa till toplevel
  if (!req.cookies.shopifyTopLevelOAuth) {
    console.log("🍪 Cookie saknas – redirectar till /auth/toplevel...");
    return res.redirect(`/auth/toplevel?shop=${shop}&host=${host}`);
  }

  // 🚀 Starta OAuth
  try {
    console.log("🚀 Startar Shopify OAuth flow...");
    await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: true,
      rawRequest: req,
      rawResponse: res,
    });
  } catch (error) {
    console.error("❌ Error starting auth:", error);
    if (!res.headersSent) res.status(500).send("Auth start failed");
  }
});

// --- 2️⃣ Callback ---
router.get("/auth/callback", async (req, res) => {
  console.log("📩 CALLBACK HIT → query:", req.query);

  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    console.log("✅ shopify.auth.callback OK");

    const accessToken = callback.session.accessToken!;
    const shop = callback.session.shop;

    console.log("💾 Sparar token för:", shop);

    // --- Spara token i Supabase ---
    await supabase
      .from("shopify_shops")
      .upsert({
        shop,
        access_token: accessToken,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    console.log("✅ Token sparad");

    // --- Registrera frakt-callback ---
    console.log("📦 Registrerar carrier service...");
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

    console.log("📦 Carrier service klar ✅");

    // ✅ Redirect tillbaka till Shopify Admin
    const host = req.query.host;
    console.log("🔁 Redirectar tillbaka in i Shopify Admin med App Bridge...");

    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
        </head>
        <body>
          <script>
            console.log("🧭 Redirect via App Bridge tillbaka till Admin...");
            const AppBridge = window['app-bridge'];
            const Redirect = AppBridge.actions.Redirect;

            const app = AppBridge.createApp({
              apiKey: "${process.env.SHOPIFY_API_KEY}",
              host: new URLSearchParams(window.location.search).get("host"),
            });

            Redirect.create(app).dispatch(
              Redirect.Action.APP,
              "/?shop=${shop}&host=${host}"
            );
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("❌ Auth callback error:", error);
    console.error("🧠 Stack trace:", error?.stack || error);
    if (!res.headersSent) res.status(500).send("Auth callback failed");
  }
});

export default router;
