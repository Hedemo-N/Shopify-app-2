import express from "express";
import crypto from "crypto";

const router = express.Router();

router.post("/", express.raw({ type: "application/json" }), (req, res) => {
  const hmacHeader = req.get("x-shopify-hmac-sha256");
  const body = req.body.toString("utf8");

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(body, "utf8")
    .digest("base64");

  if (generatedHmac !== hmacHeader) {
    console.error("❌ Invalid HMAC on webhook");
    return res.status(401).send("Unauthorized");
  }

  try {
    const payload = JSON.parse(body);
    console.log("📦 Received compliance webhook:", payload);
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error parsing webhook body", err);
    res.status(500).send("Error");
  }
});

export default router;
