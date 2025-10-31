
import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { memorySessionStorage } from "./memorySessionStorage.js";
import authRoutes from "./auth.js"; // lägg till .js här

dotenv.config();

const app = express();
const PORT = 3000;

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24, // ✅ korrekt enum
  isEmbeddedApp: false,
  sessionStorage: memorySessionStorage,
});


app.get("/", (req, res) => res.send("🚀 Blixt Delivery Shopify App"));

app.use("/", authRoutes);

export default app;

