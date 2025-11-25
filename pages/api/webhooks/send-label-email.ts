import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: true, // ✔ Här vill vi INTE ha RAW body (inte Shopify)
  },
};

const resend = new Resend(process.env.BLIXT_SHOPIFY_MAIL!);

// 🔐 Intern HMAC-verifiering
function verifyInternalHmac(req: NextApiRequest): boolean {
  const hmacHeader = req.headers["x-custom-hmac"] as string;
  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(JSON.stringify(req.body), "utf8")
    .digest("hex");

  if (!hmacHeader) return false;

return crypto.timingSafeEqual(
  Buffer.from(generatedHmac),
  Buffer.from(hmacHeader)
);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("📩 POST /api/webhooks/send-label-email");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // 🔐 Verifiera intern HMAC från orders-create webhooken
  if (!verifyInternalHmac(req)) {
    console.warn("❌ Ogiltig intern HMAC-signatur");
    return res.status(401).send("Unauthorized");
  }

  const { to, labelUrl, orderId, customerName } = req.body;

  if (!to || !labelUrl || !orderId) {
    return res
      .status(400)
      .json({ message: "Saknar fält: to, labelUrl, orderId" });
  }

  try {
    // 🔽 Ladda ner PDF och konvertera till base64
    const pdfBuffer = await fetch(labelUrl).then((r) => r.arrayBuffer());
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    const response = await resend.emails.send({
      from: "noreply@blixtdelivery.se",
      to,
      subject: `Etikett för order ${orderId}`,
      html: `
        <p>Hej!</p>
        <p>Här är fraktetiketten för order <strong>${orderId} (${customerName})</strong>.</p>
        <p><a href="${labelUrl}">Ladda ner etiketten (PDF)</a></p>
        <p>Vänliga hälsningar,<br />Blixt Delivery</p>
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
    return res.status(500).json({ error: err.message, full: err });
  }
}
