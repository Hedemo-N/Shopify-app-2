import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { memorySessionStorage } from "./memorySessionStorage.js";
import authRoutes from "./auth.js";
import ordersRoute from "./api/orders.js";
import shippingRatesRoutes from "./api/shipping-rates.js";
import ordersCreateWebhook from "./api/webhooks/orders-create.js";
import sendLabelEmailRouter from "./api/webhooks/send-label-email.js";
import path from "path";
import appUninstalledWebhook from "./api/webhooks/app-uninstalled.js";
import customersDataRequest from "./api/webhooks/customers-data-request.js";
import customersRedact from "./api/webhooks/customers-redact.js";
import shopRedact from "./api/webhooks/shop-redact.js";
import cookieParser from "cookie-parser";





// ... import statements

dotenv.config();

const app = express();
const PORT = 3000;

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: true,
  sessionStorage: memorySessionStorage,
});

// --- Static and homepage
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(process.cwd(), "public") });
});

// --- Webhook som kräver rå kropp (t.ex. HMAC-verifiering)
app.use("/", ordersCreateWebhook);

// --- NU lägger vi på JSON-parser
app.use(express.json());

// --- API-routes
app.use("/api", ordersRoute);
app.use("/", authRoutes);
app.use("/", shippingRatesRoutes);
app.use(cookieParser());
app.use("/api/webhooks", sendLabelEmailRouter);
app.use("/api/webhooks", appUninstalledWebhook);
app.use("/", customersDataRequest);
app.use("/", customersRedact);
app.use("/", shopRedact);

// --- Test-ping
app.get("/api/ping", (req, res) => {
  console.log("📡 Ping mottagen med token:", req.headers.authorization);
  res.json({ message: "Token mottagen!" });
});

export default app;
