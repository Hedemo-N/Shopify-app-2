import express, { Request, Response } from "express";
import { Resend } from "resend";
import crypto from "crypto";

const router = express.Router();
const resend = new Resend(process.env.BLIXT_SHOPIFY_MAIL!);

// 🔐 Lägg till denna funktion här:
function verifyInternalHmac(req: Request): boolean {
  const hmacHeader = req.get("X-Custom-HMAC") || "";
  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(JSON.stringify(req.body), "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(generatedHmac), Buffer.from(hmacHeader));
}


console.log("🔐 MAIL API KEY finns?", Boolean(process.env.BLIXT_SHOPIFY_MAIL));

router.post("/send-label-email", async (req: Request, res: Response) => {
  console.log("📩 POST /send-label-email anropad");

    if (!verifyInternalHmac(req)) {
    console.warn("❌ Ogiltig intern HMAC-signatur");
    return res.status(401).send("Unauthorized");
  }

  const { to, labelUrl, orderId, customerName } = req.body;

  if (!to || !labelUrl || !orderId) {
    return res.status(400).json({ message: "Saknar fält: to, labelUrl, orderId" });
  }

  try {
    // 🔽 Ladda ner PDF:en från URL och konvertera till base64
    const pdfBuffer = await fetch(labelUrl).then(res => res.arrayBuffer());
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    const response = await resend.emails.send({
      from: "noreply@blixtdelivery.se",
      to,
      subject: `Etikett för order ${orderId}`,
      html: `
        <p>Hej!</p>
        <p>Här är din fraktetikett för order <strong>${orderId} till kund ${customerName}</strong>.</p>
        <p><a href="${labelUrl}">Ladda ner etiketten (PDF)</a></p>
        <p>Vänliga hälsningar,<br />Blixt</p>
        `,
      attachments: [
        {
          filename: `etikett-${orderId}.pdf`,
          content: pdfBase64,
          contentType: "application/pdf",
        },
      ],
    });

    return res.status(200).json({ success: true, response });
  } catch (err: any) {
    console.error("❌ Kunde inte skicka mail:", err);
    res.status(500).json({ error: err.message, full: err });
  }
});

export default router;
