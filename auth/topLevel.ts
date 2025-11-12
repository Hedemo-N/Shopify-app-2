// app/auth/topLevel.ts
import express from "express";
const router = express.Router();

router.get("/auth/toplevel", (req, res) => {
  const { shop, host } = req.query;
  console.log("🚪 /auth/toplevel hit →", { shop, host });

  if (!shop || !host) {
    console.warn("⚠️ Saknar shop eller host i toplevel!");
    return res.status(400).send("Missing shop or host");
  }

  // 🍪 Sätt cookie
  console.log("🍪 Sätter cookie shopifyTopLevelOAuth...");
  res.cookie("shopifyTopLevelOAuth", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  // 🔁 Ladda om för att starta OAuth
  const redirectUrl = `${process.env.SHOPIFY_APP_URL}/auth?shop=${shop}&host=${host}`;
  console.log("🔁 Redirectar vidare till:", redirectUrl);

  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
      </head>
      <body>
        <p>Redirecting to authentication...</p>
      </body>
    </html>
  `);
});

export default router;
