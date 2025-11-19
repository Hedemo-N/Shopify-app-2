import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
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
import path from "path";
import cookieParser from "cookie-parser";
import topLevelAuthRoute from "./auth/topLevel.js";
import { customSessionStorage } from "./customSessionStorage.js";
import complianceWebhook from "./api/webhooks/compliance.js";
import { verifySessionToken } from "./middleware/verifySessionToken.js";

dotenv.config();

const app = express();
const PORT = 3000;

// 🧠 Viktigt: Vercel kör HTTPS
app.set("trust proxy", 1);

// --- RAW webhook först
app.use("/", ordersCreateWebhook);

// --- Middleware
app.use(cookieParser());
app.use(express.json());

// 🛡 Session token-verifiering på ALLA /api requests
app.use("/api", (req, res, next) => {
  if (req.path === "/shipping-rates") return next(); // ❗ släpp igenom shipping-rates
  return verifySessionToken(req, res, next);
});


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

// --- Routes ---
app.use("/", topLevelAuthRoute);
app.use("/", authRoutes);

// Webhooks
app.use("/api/webhooks", complianceWebhook);
app.use("/api/webhooks", appUninstalledWebhook);

// Static files
app.use(express.static("public"));

// Root
app.get("/", (req, res) => {
  const shop = req.query.shop as string;
  const host = req.query.host as string;

  if (shop && host) {
    return res.redirect(`/auth?shop=${shop}&host=${host}`);
  }

  res.sendFile("index.html", { root: path.join(process.cwd(), "public") });
});

// API endpoints
app.use("/api", ordersRoute);
app.use("/", shippingRatesRoutes);
app.use("/api/webhooks", sendLabelEmailRouter);
app.use("/", customersDataRequest);
app.use("/", customersRedact);
app.use("/", shopRedact);

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
