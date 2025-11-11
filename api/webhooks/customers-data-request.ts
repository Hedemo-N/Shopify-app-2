// customers-data-request.ts
import express from "express";
import crypto from "crypto";
const router = express.Router();

router.post("/api/webhooks/customers-data-request", express.raw({ type: "application/json" }), (req, res) => {
  const hmac = req.get("X-Shopify-Hmac-Sha256") || "";
  const body = req.body;
  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(body, "utf8")
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(generatedHmac), Buffer.from(hmac))) {
    console.warn("❌ Ogiltig HMAC för data request");
    return res.status(401).send("Unauthorized");
  }

  const payload = JSON.parse(body.toString("utf8"));
  console.log("🧾 Kunden begär data:", payload);

  res.status(200).send("Data request mottagen");
});

export default router;
