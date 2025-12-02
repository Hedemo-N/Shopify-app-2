import "@shopify/shopify-api/adapters/node";
import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { shop, host, company, contact, email, phone, access_token } = req.body;

    console.log("📬 E-post skickas med token:", access_token);

    await resend.emails.send({
      from: "Blixt Onboarding <no-reply@blixtdelivery.se>",
      to: "niklas.hedemo@blixtdelivery.se",
      subject: `Ny onboarding: ${company}`,
      html: `
        <h2>Ny Shopify Onboarding</h2>
        <p><b>Shop:</b> ${shop}</p>
        <p><b>Host:</b> ${host}</p>
        <p><b>Access Token:</b> ${access_token || "❌ Saknas"}</p>
        <p><b>Företag:</b> ${company}</p>
        <p><b>Kontaktperson:</b> ${contact}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Telefon:</b> ${phone}</p>
      `,
    });

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
}
