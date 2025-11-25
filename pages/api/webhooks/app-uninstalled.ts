import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

// För att Next.js inte ska parsa body automatiskt
export const config = {
  api: {
    bodyParser: false,
  },
};

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

  const rawBody = await buffer(req);
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;

  if (!hmacHeader || !rawBody) {
    console.warn("❌ Saknar HMAC-header eller raw body");
    return res.status(400).send("Bad request");
  }

  const generatedHash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(rawBody)
    .digest("base64");

  if (!crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(hmacHeader))) {
    console.warn("🔒 HMAC mismatch");
    return res.status(401).send("Unauthorized");
  }

  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    const shop = payload.domain;

    console.log(`🧹 App avinstallerad av: ${shop}`);

    // TODO: Rensa Supabase / sessioner
    return res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Fel vid avinstallation:", error);
    return res.status(500).send("Serverfel");
  }
}
