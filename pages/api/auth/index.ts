import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).send("Missing shop parameter");
  }

  // CSRF state
  const state = crypto.randomBytes(16).toString("hex");

  // Spara state i cookie
  res.setHeader("Set-Cookie", `shopify_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/`);

  const redirectUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${process.env.SHOPIFY_API_SCOPES}` +
    `&redirect_uri=${encodeURIComponent(process.env.SHOPIFY_API_REDIRECT_URI!)}` +
    `&state=${state}`;

  res.redirect(redirectUrl);
}
