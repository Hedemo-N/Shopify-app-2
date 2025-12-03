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

  console.log("🔍 /api/auth called with:", { shop, host });
  console.log("🍪 Cookies:", req.cookies);

  if (!shop) {
    console.warn("❌ Missing shop");
    return res.status(400).send("Missing shop parameter");
  }

  if (!host) {
    console.warn("❌ Missing host");
    return res.status(400).send("Missing host parameter");
  }

  // Kolla om cookie finns
  const hasCookie = req.cookies["shopifyTopLevelOAuth"] === "1";
  console.log("🍪 Has cookie?", hasCookie);

  if (!hasCookie) {
    console.log("➡️ No cookie - redirecting to toplevel");
    return res.redirect(`/api/auth/toplevel?shop=${shop}&host=${host}`);
  }

  // Cookie finns - starta OAuth
  console.log("✅ Cookie found - starting OAuth");
  const state = crypto.randomBytes(16).toString("hex");
  const oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${encodeURIComponent(
    `${process.env.SHOPIFY_APP_URL}/api/auth/callback`
  )}&state=${state}`;

  console.log("🔐 OAuth URL:", oauthUrl);

  return res.redirect(oauthUrl);
}