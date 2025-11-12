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

dotenv.config();

const app = express();
const PORT = 3000;

// 🧠 Viktigt: Vercel kör HTTPS och kräver detta för korrekta headers
app.set("trust proxy", 1);

// 🧩 Middleware
app.use(cookieParser());
app.use(express.json());

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

// --- Webhooks (måste vara raw innan JSON-parser används) ---
app.use("/", ordersCreateWebhook);
app.use("/api/webhooks", appUninstalledWebhook);

// --- Statisk filserver ---
app.use(express.static("public"));

// --- Root: redirect vid installation annars index.html ---
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

// --- API och webhooks ---
app.use("/api", ordersRoute);
app.use("/", shippingRatesRoutes);
app.use("/api/webhooks", sendLabelEmailRouter);
app.use("/", customersDataRequest);
app.use("/", customersRedact);
app.use("/", shopRedact);

// --- Start ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
