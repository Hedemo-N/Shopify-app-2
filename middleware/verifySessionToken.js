import jwt from "jsonwebtoken";

export function verifySessionToken(req, res, next) {
  const header = req.headers["authorization"];

  if (!header) {
    console.warn("❌ Missing Authorization header");
    return res.status(401).send("Unauthorized");
  }

  const token = header.replace("Bearer ", "").trim();

  try {
    // Verifiera signaturen via Shopify secret
    const decoded = jwt.verify(token, process.env.SHOPIFY_API_SECRET);

    // Validera claims
    if (!decoded.dest || !decoded.sub || !decoded.exp) {
      console.warn("⚠️ Invalid session token claims", decoded);
      return res.status(401).send("Unauthorized");
    }

    // Lägg decoded token på req för vidare användning
    req.shopifySession = decoded;

    next();
  } catch (err) {
    console.error("❌ Invalid session token:", err);
    return res.status(401).send("Unauthorized");
  }
}
