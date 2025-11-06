import express, { Request, Response } from "express";
import { Resend } from "resend";

const router = express.Router();
const resend = new Resend(process.env.BLIXT_SHOPIFY_MAIL!);

router.post("/send-label-email", async (req: Request, res: Response) => {

  const { to, labelUrl, orderId } = req.body;

  if (!to || !labelUrl || !orderId) {
    return res.status(400).json({ message: "Saknar fält: to, labelUrl, orderId" });
  }

  try {
    const response = await resend.emails.send({
      from: "Blixt Leverans <noreply@din-domän.se>",
      to,
      subject: `Etikett för order ${orderId}`,
      html: `
        <p>Hej!</p>
        <p>Här är din fraktetikett för order <strong>${orderId}</strong>.</p>
        <p><a href="${labelUrl}">Ladda ner etiketten (PDF)</a></p>
        <p>Vänliga hälsningar,<br />Blixt</p>
      `,
    });

    return res.status(200).json({ success: true, response });
  } catch (err: any) {
    console.error("❌ Kunde inte skicka mail:", err);
    return res.status(500).json({ message: "Fel vid mailutskick", error: err.message });
  }
});

export default router;
