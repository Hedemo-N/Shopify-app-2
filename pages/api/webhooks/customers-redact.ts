import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // Shopify kräver raw body
  },
};

// ✔ Funktion för att läsa raw body i Next.js
function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Endast POST
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const rawBody = await buffer(req);
  const body = rawBody.toString("utf8");

  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;

  if (!hmacHeader || !rawBody) {
    console.warn("❌ Saknar HMAC-header eller raw body");
    return res.status(400).send("Bad request");
  }

  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(rawBody)
    .digest("base64");

  const valid = crypto.timingSafeEqual(
    Buffer.from(generatedHash),
    Buffer.from(hmacHeader)
  );

  if (!valid) {
    console.warn("🔒 Ogiltig HMAC för customers/redact");
    return res.status(401).send("Unauthorized");
  }

  try {
    const payload = JSON.parse(body);
    console.log("🧽 customers/redact mottagen:", payload);

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Fel vid customers/redact:", err);
    return res.status(500).send("Serverfel");
  }
}
