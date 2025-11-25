import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import fetch from "node-fetch";
import { memorySessionStorage } from "../../../frontend/lib/memorySessionStorage";

type ShopifyAccessTokenResponse = {
  access_token: string;
  scope: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shop, hmac, code, state } = req.query;

  if (!shop || !hmac || !code || !state) {
    return res.status(400).send("Missing required parameters");
  }

  // Verify state (CSRF)
  const stateCookie = req.cookies["shopify_state"];
  if (state !== stateCookie) {
    return res.status(400).send("Invalid state");
  }

  // Verify HMAC
  const params = { ...req.query };
  delete params.hmac;
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(message)
    .digest("hex");

  if (generatedHmac !== hmac) {
    return res.status(401).send("HMAC validation failed");
  }

  // Exchange code for access token
  const tokenUrl = `https://${shop}/admin/oauth/access_token`;

  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  const tokenJson = (await tokenResponse.json()) as ShopifyAccessTokenResponse;


  if (!tokenJson.access_token) {
    return res.status(400).send("Failed to retrieve access token");
  }

  // Save session in your in-memory store
  await memorySessionStorage.storeSession({
    id: shop.toString(),
    shop: shop.toString(),
    accessToken: tokenJson.access_token,
    scope: tokenJson.scope,
  });

  // Redirect back into embedded app
  const host = req.query.host as string;
  res.redirect(`/?shop=${shop}&host=${host}`);
}
