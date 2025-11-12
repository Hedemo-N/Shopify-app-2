import express from "express";
import crypto from "crypto";

const router = express.Router();

router.post("/customers/data_request", express.raw({ type: "application/json" }), (req, res) => {
  const hmac = req.get("X-Shopify-Hmac-Sha256") || "";
  const body = req.body;
  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(body) // 🧩 ta bort "utf8"
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(generatedHmac), Buffer.from(hmac))) {
    console.warn("❌ Ogiltig HMAC för customers/data_request");
    return res.status(401).send("Unauthorized");
  }

  const payload = JSON.parse(body.toString("utf8"));
  console.log("🧾 customers/data_request payload:", payload);

  res.status(200).send("OK");
});

export default router;
