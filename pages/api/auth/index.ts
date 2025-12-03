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

  if (!shop || !host) {
    return res.status(400).send("Missing shop or host");
  }

  if (!req.cookies["shopifyTopLevelOAuth"]) {
    return res.redirect(`/api/auth/toplevel?shop=${shop}&host=${host}`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${process.env.SHOPIFY_APP_URL}/api/auth/callback&state=${state}`;

  return res.redirect(redirectUri);
}
