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
import complianceWebhooks from "./api/webhooks/compliance.js";







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
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(process.cwd(), "public") });
});

app.get("/api/ping", (req, res) => {
  console.log("📡 Ping mottagen med token:", req.headers.authorization);
  res.json({ message: "Token mottagen!" });
});


// 💡 Viktigt: Lägg webhooken före express.json()
app.use("/", ordersCreateWebhook);

app.use(express.json());
app.use("/api", ordersRoute);
app.use("/", authRoutes);
app.use("/", shippingRatesRoutes);
app.use("/api/webhooks", sendLabelEmailRouter);
app.use(express.static("public"));
app.use("/api/webhooks", appUninstalledWebhook);
app.use("/", complianceWebhooks);



export default app;
