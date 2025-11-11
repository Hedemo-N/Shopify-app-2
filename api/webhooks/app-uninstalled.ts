import express from "express";
import { supabase } from "../../supabaseClient.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import crypto from "crypto";

dotenv.config();

const router = express.Router();

// 🧠 Shopify kräver raw body för HMAC-verifiering
router.use("/app-uninstalled", bodyParser.raw({ type: "application/json" }));

router.post("/app-uninstalled", async (req, res) => {
  const isValid = verifyHmac(req, process.env.SHOPIFY_API_SECRET!);

  if (!isValid) {
    console.warn("⚠️ Ogiltig HMAC-signatur på webhook");
    return res.status(401).send("Unauthorized");
  }

  const data = JSON.parse(req.body.toString("utf8"));
  const shop = data.domain;

  console.log("👋 App avinstallerad:", shop);

  await supabase.from("shopify_shops").delete().eq("shop", shop);

  res.status(200).send("Webhook mottagen");
});

function verifyHmac(req: express.Request, secret: string): boolean {
  const hmac = req.headers["x-shopify-hmac-sha256"] as string;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(req.body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

export default router;
