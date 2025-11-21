import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

import authRoutes from "./auth.js";
import ordersRoute from "./api/orders.js";
import shippingRatesRoutes from "./api/shipping-rates.js";
import ordersCreateWebhook from "./api/webhooks/orders-create.js";
import sendLabelEmailRouter from "./api/webhooks/send-label-email.js";
import appUninstalledWebhook from "./api/webhooks/app-uninstalled.js";
import customersDataRequest from "./api/webhooks/customers-data-request.js";
import customersRedact from "./api/webhooks/customers-redact.js";
import shopRedact from "./api/webhooks/shop-redact.js";
import topLevelAuthRoute from "./auth/topLevel.js";
import complianceWebhook from "./api/webhooks/compliance.js";
import onboardingCompleteRoute from "./api/onboarding-complete.js";
import createProfileRoute from "./api/webhooks/create-profile.js";

import { customSessionStorage } from "./customSessionStorage.js";
import { verifySessionToken } from "./middleware/verifySessionToken.js";
import { supabase } from "./supabaseClient.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);

// --- Shopify init ---
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage: customSessionStorage,
});

// --- Middleware ---
app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));

// --- RAW webhooks ---
app.use("/", ordersCreateWebhook);
app.use("/api", createProfileRoute);

// --- Session token skydd på /api (förutom shipping-rates) ---
app.use("/api", (req, res, next) => {
  if (req.path === "/shipping-rates") return next();
  return verifySessionToken(req, res, next);
});

// --- Auth routes ---
app.use("/", topLevelAuthRoute);
app.use("/", authRoutes);

// --- Webhooks ---
app.use("/api/webhooks", complianceWebhook);
app.use("/api/webhooks", appUninstalledWebhook);
app.use("/api/webhooks", sendLabelEmailRouter);
app.use("/", customersDataRequest);
app.use("/", customersRedact);
app.use("/", shopRedact);

// --- Onboarding backend ---
app.use("/api", onboardingCompleteRoute);

// --- API ---
app.use("/api", ordersRoute);
app.use("/", shippingRatesRoutes);

// --- Inloggning och Onboarding UI ---
app.get("/login", (req, res) => {
  return res.sendFile("login.html", { root: path.join(process.cwd(), "public") });
});

// --- Root route → styr vad som ska visas ---
app.get("/", async (req, res) => {
  try {
    const { shop, host } = req.query;
    if (!shop || !host) {
      console.warn("❌ Missing shop or host in /");
      return res.status(400).send("Missing shop or host");
    }

    const { data: shopRows, error } = await supabase
      .from("shopify_shops")
      .select("user_id")
      .eq("shop", shop);

    if (error) {
      console.error("❌ Supabase query error:", error);
      return res.status(500).send("Database error");
    }

    if (!shopRows || shopRows.length === 0) {
      console.warn("⚠️ Ingen shop hittades i DB:", shop);
      return res.redirect(`/auth?shop=${shop}&host=${host}`);
    }

    if (shopRows.length > 1) {
      console.error("❌ Flera rader med samma shop – ska bara vara en:", shopRows);
      return res.status(500).send("Database error: multiple shops found");
    }

    const shopRow = shopRows[0];
    if (!shopRow.user_id) {
      console.log("🟡 Shop saknar user_id – visa onboarding");
      return res.sendFile("onboarding.html", { root: path.join(process.cwd(), "public") });
    }

    console.log("🟢 Shop onboarded → visa admin-panel");
    return res.sendFile("index.html", { root: path.join(process.cwd(), "public") });

  } catch (err) {
    console.error("❌ Root route error:", err);
    return res.status(500).send("Unexpected error");
  }
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
