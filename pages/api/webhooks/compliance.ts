import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false, // Shopify kräver RAW body
  },
};

// ✔ Funktion för att få raw body
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
  const body = rawBody.toString("utf8");
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string | undefined;

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(body, "utf8")
    .digest("base64");

  if (generatedHmac !== hmacHeader) {
    console.error("❌ Invalid HMAC on webhook");
    return res.status(401).send("Unauthorized");
  }

  try {
    const payload = JSON.parse(body);
    console.log("📦 Received compliance webhook:", payload);
    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error parsing webhook body:", err);
    return res.status(500).send("Error");
  }
}
