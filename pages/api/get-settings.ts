import type { NextApiRequest, NextApiResponse } from "next";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.July24,
});

// ----------------------------------------------------
// ✔ NY VERSION: INTE middleware
// ✔ Returnerar true/false
// ✔ Next.js-kompatibel
// ----------------------------------------------------
export async function verifySessionToken(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Missing session token" });
      return false;
    }

    // Dekoda token
    await shopify.session.decodeSessionToken(token);

    return true; // ✔ Validering OK
  } catch (err) {
    console.error("❌ Invalid session token:", err);
    res.status(401).json({ error: "Invalid session token" });
    return false;
  }
}
