// app/webhooks/shop-redact.ts

import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";

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
    .update(rawBody)
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(hmacHeader))) {
    console.warn("🔒 Ogiltig HMAC för shop/redact");
    return res.status(401).send("Unauthorized");
  }

  next();
}

// 🏪 POST-endpoint för shop/redact
router.post(
  "/shop/redact",
  express.raw({ type: "application/json" }),
  verifyHmac,
  (req: Request, res: Response) => {
    try {
      const payload = JSON.parse((req.body as Buffer).toString("utf8"));
      console.log("🏪 shop/redact mottagen:", payload);
      res.status(200).send("OK");
    } catch (error) {
      console.error("❌ Fel vid shop/redact:", error);
      res.status(500).send("Serverfel");
    }
  }
);

export default router;
