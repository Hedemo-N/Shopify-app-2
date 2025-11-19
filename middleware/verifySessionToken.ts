import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function verifySessionToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers["authorization"];

  if (!header) {
    console.warn("❌ Missing Authorization header");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.replace("Bearer ", "").trim();

  try {
    const decoded = jwt.verify(token, process.env.SHOPIFY_API_SECRET!);

    // Basic claim check
    if (
      typeof decoded !== "object" ||
      !decoded ||
      !("dest" in decoded) ||
      !("sub" in decoded) ||
      !("exp" in decoded)
    ) {
      console.warn("⚠️ Invalid session token claims", decoded);
      return res.status(401).json({ error: "Invalid token claims" });
    }

    // Spara i request-objektet
    (req as any).shopifySession = decoded;

    return next();
  } catch (err) {
    console.error("❌ Invalid session token:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}
