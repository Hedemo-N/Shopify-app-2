import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

dotenv.config();

const router = express.Router();

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: false,
});

// Start auth
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

// Callback after auth
router.get("/auth/callback", async (req, res) => {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const accessToken = callback.session.accessToken;
    const shop = callback.session.shop;

    console.log("✅ Auth success:");
    console.log("Shop:", shop);
    console.log("Access token:", accessToken);

    res.send("App installed successfully! You can close this tab.");
  } catch (error) {
    console.error("❌ Auth callback error:", error);
    res.status(500).send("Auth callback failed");
  }
});

export default router;
