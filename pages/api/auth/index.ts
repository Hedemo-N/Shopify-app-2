import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }

  const shop = req.query.shop as string;
  const host = req.query.host as string;
  const embedded = req.query.embedded as string;

  console.log("🔍 /api/auth called");
  console.log("📥 Query:", { shop, host, embedded });

  if (!shop) {
    console.warn("❌ Missing shop");
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>Error: Missing shop parameter</h2>
          <p>This app must be accessed through Shopify Admin.</p>
        </body>
      </html>
    `);
  }

  // För embedded apps utan host - använd toplevel
  if (embedded === "1" && !host) {
    console.log("📱 Embedded app without host - using toplevel");
    return res.redirect(`/api/auth/toplevel?shop=${shop}`);
  }

  // Starta OAuth direkt
  console.log("✅ Starting OAuth flow");
  const state = crypto.randomBytes(16).toString("hex");
  const oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${encodeURIComponent(process.env.SHOPIFY_SCOPES!)}&redirect_uri=${encodeURIComponent(
    `${process.env.SHOPIFY_APP_URL}/api/auth/callback`
  )}&state=${state}${host ? `&host=${host}` : ""}`;

  console.log("🔐 Redirecting to OAuth:", oauthUrl);

  return res.redirect(oauthUrl);
}