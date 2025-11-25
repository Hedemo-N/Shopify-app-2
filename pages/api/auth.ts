import type { NextApiRequest, NextApiResponse } from "next";
import "@shopify/shopify-api/adapters/node";
import crypto from "crypto";
import { supabase } from "../../frontend/lib/supabaseClient";


interface ShopifyAccessTokenResponse {
  access_token?: string;
  scope?: string;
  associated_user?: {
    id: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export const config = {
  api: {
    bodyParser: true,
  },
};

// -----------------------------
// 1️⃣ /api/auth  — Start OAuth
// -----------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET" && req.url?.startsWith("/api/auth/callback")) {
    return authCallback(req, res);
  }
  if (req.method === "GET") {
    return startAuth(req, res);
  }

  return res.status(405).send("Method not allowed");
}

// ---- Starta OAuth ----
async function startAuth(req: NextApiRequest, res: NextApiResponse) {
  try {
    const shop = req.query.shop as string;
    const host = req.query.host as string;

    console.log("➡️ /api/auth HIT");
    console.log("🛍️ shop:", shop);
    console.log("🏠 host:", host);

    if (!shop || !host) {
      return res.status(400).send("Missing shop or host");
    }

    // 🍪 Kolla top-level cookie
    if (!req.cookies["shopifyTopLevelOAuth"]) {
      console.log("🔁 Redirecting to top-level auth...");
      return res.redirect(`/api/auth/toplevel?shop=${shop}&host=${host}`);
    }

    const state = crypto.randomBytes(16).toString("hex");

    const redirectUri = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SHOPIFY_SCOPES}&redirect_uri=${process.env.SHOPIFY_APP_URL}/api/auth/callback&state=${state}`;

    console.log("🔗 Redirecting to Shopify OAuth:", redirectUri);

    return res.redirect(redirectUri);
  } catch (err) {
    console.error("❌ Auth start error:", err);
    return res.status(500).send("Auth start failed");
  }
}

// -----------------------------
// 2️⃣ OAuth Callback
// -----------------------------
async function authCallback(req: NextApiRequest, res: NextApiResponse) {
  console.log("✅ /api/auth/callback HIT");
  console.log("🧾 query params:", req.query);

  try {
    const { shop, code, host } = req.query;

    if (!shop || !code || !host) {
      console.error("❌ Missing required params");
      return res.status(400).send("Missing params");
    }

    // ---- Hämta access_token ----
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as ShopifyAccessTokenResponse;

    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("❌ No access token in response", tokenData);
      return res.status(500).send("Token error");
    }

    console.log("🔑 Access token:", accessToken);

    // ---- Sparar shop i DB ----
    const merchantId = tokenData.associated_user?.id ?? null;

    const { error: upsertError } = await supabase
      .from("shopify_shops")
      .upsert(
        {
          shop,
          access_token: accessToken,
          installed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: merchantId,
        },
        { onConflict: "shop" }
      );

    if (upsertError) {
      console.error("❌ Failed to save shop:", upsertError);
    }

    // ---- Registrera Carrier Service ----
    await fetch(`https://${shop}/admin/api/2024-10/carrier_services.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        carrier_service: {
          name: "Blixt Delivery",
          callback_url: `${process.env.SHOPIFY_APP_URL}/api/shipping-rates`,
          service_discovery: true,
        },
      }),
    });

    console.log("🚚 Carrier Service registered");

    // ---- Redirect tillbaka till appen ----
    res.send(`
      <html>
        <head>
          <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
        </head>
        <body>
          <script>
            const AppBridge = window['app-bridge'];
            const Redirect = AppBridge.actions.Redirect;

            const app = AppBridge.createApp({
              apiKey: "${process.env.SHOPIFY_API_KEY}",
              host: "${host}"
            });

            Redirect.create(app).dispatch(
              Redirect.Action.APP,
              "/?shop=${shop}&host=${host}"
            );
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("❌ authCallback error:", err);
    return res.status(500).send("OAuth failed");
  }
}
