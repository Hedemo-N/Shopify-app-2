import express, { Request, Response } from "express";
import { Resend } from "resend";

const router = express.Router();
const resend = new Resend(process.env.BLIXT_SHOPIFY_MAIL!);
console.log("🔐 MAIL API KEY finns?", Boolean(process.env.BLIXT_SHOPIFY_MAIL));

router.post("/send-label-email", async (req: Request, res: Response) => {
  console.log("📩 POST /send-label-email anropad");

  const { to, labelUrl, orderId } = req.body;

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
        <p>Här är din fraktetikett för order <strong>${orderId}</strong> bifogad som PDF.</p>
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
