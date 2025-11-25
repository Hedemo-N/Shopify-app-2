import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // Shopify kräver RAW body
  },
};

// Buffer helper (ersätter express.raw)
function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  // Läs RAW body från Shopify
  const rawBody = await buffer(req);
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;

  if (!hmacHeader) {
    console.warn("❌ Saknar HMAC-header");
    return res.status(400).send("Bad request");
  }

  // Verifiera HMAC
  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(rawBody)
    .digest("base64");

  const valid = crypto.timingSafeEqual(
    Buffer.from(generatedHash),
    Buffer.from(hmacHeader)
  );

  if (!valid) {
    console.warn("🔒 Ogiltig HMAC för shop/redact");
    return res.status(401).send("Unauthorized");
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    console.log("🏪 shop/redact mottagen:", payload);

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Fel vid shop/redact:", err);
    return res.status(500).send("Serverfel");
  }
}
