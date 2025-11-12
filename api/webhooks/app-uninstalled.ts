// app/webhooks/app-uninstalled.ts

import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 🛡️ Middleware för att verifiera webhook-signaturen
function verifyHmac(req: Request, res: Response, next: NextFunction) {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
  const rawBody = req.body as Buffer;

  if (!hmacHeader || !rawBody) {
    console.warn("❌ Saknar HMAC-header eller raw body");
    return res.status(400).send("Bad request");
  }

const generatedHash = crypto
  .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
  .update(rawBody) // 🧩 ta bort "utf8"
  .digest("base64");


  if (generatedHash !== hmacHeader) {
    console.warn("🔒 HMAC mismatch");
    return res.status(401).send("Unauthorized");
  }

  next();
}

// 🚪 POST-endpoint för avinstallation
router.post(
  "/app-uninstalled",
  express.raw({ type: "*/*" }), // 👈 Behåll raw body (viktigt för HMAC)
  verifyHmac,
  async (req: Request, res: Response) => {
    try {
      const payload = JSON.parse((req.body as Buffer).toString());
      const shop = payload.domain;

      console.log(`🧹 App avinstallerad av: ${shop}`);

      // TODO: Lägg till eventuell rensning av sessions / Supabase-data här

      res.status(200).send("OK");
    } catch (error) {
      console.error("❌ Fel vid avinstallation:", error);
      res.status(500).send("Serverfel");
    }
  }
);

export default router;
