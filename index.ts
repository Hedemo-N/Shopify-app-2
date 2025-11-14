import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

import path from "path";
import cookieParser from "cookie-parser";

import authRoutes from "./auth.js";
import topLevelAuthRoute from "./auth/topLevel.js";

import ordersRoute from "./api/orders.js";
import shippingRatesRoutes from "./api/shipping-rates.js";

import ordersCreateWebhook from "./api/webhooks/orders-create.js";
import appUninstalledWebhook from "./api/webhooks/app-uninstalled.js";
import sendLabelEmailRouter from "./api/webhooks/send-label-email.js";
import customersDataRequest from "./api/webhooks/customers-data-request.js";
import customersRedact from "./api/webhooks/customers-redact.js";
import shopRedact from "./api/webhooks/shop-redact.js";
import complianceWebhook from "./api/webhooks/compliance.js";

import { customSessionStorage } from "./customSessionStorage.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Shopify kräver korrekt proxy-hantering
app.set("trust proxy", 1);

// ---------------------------------------------
// 🔒 Först: CookieParser (påverkar inte raw)
// ---------------------------------------------
app.use(cookieParser());


// =======================================================
// 🚨 VIKTIGT — Webhooks MÅSTE komma före express.json()
// Detta är Shopify-kravet för att HMAC ska fungera.
// =======================================================

// RAW WEBHOOKS (HMAC behöver rå body)
app.use("/", ordersCreateWebhook);
app.use("/api/webhooks", appUninstalledWebhook);
app.use("/api/webhooks", sendLabelEmailRouter);
app.use("/", customersDataRequest);
app.use("/", customersRedact);
app.use("/", shopRedact);

// Shopify compliance webhook
app.use("/api/webhooks", complianceWebhook);


// =======================================================
// 🔄 Efter webhooks: JSON-parser
// =======================================================
app.use(express.json());


// ---------------------------------------------------------
// 🔐 Shopify auth och sessions
// ---------------------------------------------------------
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage: customSessionStorage,
});

// Auth routes
app.use("/", topLevelAuthRoute);
app.use("/", authRoutes);


// ---------------------------------------------------------
// 🚚 Övriga API-routes (kan använda JSON normalt)
// ---------------------------------------------------------
app.use("/api", ordersRoute);
app.use("/", shippingRatesRoutes);


// ---------------------------------------------------------
// 🖼 Statisk filserver
// ---------------------------------------------------------
app.use(express.static("public"));


// ---------------------------------------------------------
// 🏠 Root route – hanterar installation & index.html
// ---------------------------------------------------------
app.get("/", (req, res) => {
  const shop = req.query.shop as string;
  const host = req.query.host as string;

  if (shop && host) {
    console.log("🧭 Redirecting to /auth for:", shop);
    return res.redirect(`/auth?shop=${shop}&host=${host}`);
  }

  console.log("📄 Serving public/index.html");
  res.sendFile("index.html", { root: path.join(process.cwd(), "public") });
});


// ---------------------------------------------------------
// 🚀 Start server
// ---------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
