import express from "express";
import getRawBody from "raw-body";
import crypto from "crypto";

const router = express.Router();

router.post("/api/webhooks/app-uninstalled", async (req, res) => {
  let rawBody;

  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error("❌ Failed to read raw body:", err);
    return res.status(400).send("Invalid body");
  }

  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;

  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(rawBody)
    .digest("base64");

  if (digest !== hmacHeader) {
    console.warn("⚠️ Webhook HMAC mismatch");
    return res.status(401).send("Unauthorized");
  }

  const payload = JSON.parse(rawBody.toString());
  const shop = payload.domain;

  console.log("🧹 App avinstallerad av:", shop);

  // TODO: Rensa databasen, sessions etc

  res.status(200).send("Webhook received");
});

export default router;
