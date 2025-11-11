import express, { Request, Response } from "express";
import crypto from "crypto";

const router = express.Router();

// Shopify kräver rå kropp för att verifiera HMAC
router.post(
  "/api/webhooks/compliance",
  express.raw({ type: "application/json" }),
  (req: Request, res: Response) => {
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const body = req.body;

    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(body, "utf8")
      .digest("base64");

    if (!hmacHeader || !crypto.timingSafeEqual(Buffer.from(generatedHmac), Buffer.from(hmacHeader))) {
      console.warn("❌ Ogiltig HMAC på compliance-webhook");
      return res.status(401).send("Unauthorized");
    }

    try {
        const topic = req.get("X-Shopify-Topic");
console.log("🧠 Webhook-topic:", topic);

      const payload = JSON.parse(body.toString("utf8"));
      console.log("📜 Mottagen compliance-webhook:");
      console.dir(payload, { depth: null });

      // Inga databasoperationer krävs – bara logga eller hantera om du vill
      return res.status(200).send("Webhook mottagen");
    } catch (err) {
      console.error("❌ Fel i webhookhantering:", err);
      return res.status(500).send("Internal server error");
    }
  }
);

export default router;
