import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {

  console.log("📡 /api/ping anropad!");
  res.status(200).json({ message: "Pong från /api/ping!" });
}
 