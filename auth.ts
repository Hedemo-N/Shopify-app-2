import "@shopify/shopify-api/adapters/node";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";


const router = express.Router();

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ""),
  apiVersion: ApiVersion.July24, // ✅ korrekt enum
  isEmbeddedApp: false,
});


router.get("/auth", async (req, res) => {
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
});

router.get("/auth/callback", async (req, res) => {
  try {
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    console.log("✅ Access token:", session.session.accessToken);

    res.send("App installed! You can close this tab.");
  } catch (error) {
    console.error("❌ Auth callback error:", error);
    res.status(500).send("Auth failed");
  }
});

export default router;
