import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log("📡 /api/ping anropad!");
  res.status(200).json({ message: "Pong från /api/ping!" });
}
 