import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { supabase } from "frontend/lib/supabaseClient";
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

// Kontrollera Supabase istället för cookie
const { data: existingShop } = await supabase
  .from("profiles")
  .select("id")
  .eq("shop", shop)
  .maybeSingle();

if (!existingShop) {
  // Om det är en ny shop, kör toplevel för första gången
  return res.redirect(`/api/auth/toplevel?shop=${shop}&host=${host}`);
}


  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${process.env.SHOPIFY_APP_URL}/api/auth/callback&state=${state}`;

  return res.redirect(redirectUri);
}
