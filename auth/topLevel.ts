import express from "express";

const router = express.Router();

router.get("/auth/toplevel", (req, res) => {
  const { shop, host } = req.query;

  if (!shop || !host) {
    return res.status(400).send("Missing shop or host");
  }

  // 🧠 Viktigt: tillåt cookies i embedded apps
  res.cookie("shopifyTopLevelOAuth", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  // Förhindra cache-loopar
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  // 🔁 Meta refresh istället för window.top
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
       <meta http-equiv="refresh" content="0;url=${process.env.SHOPIFY_APP_URL}/auth?shop=${shop}&host=${host}">

      </head>
      <body>
        <p>Redirecting to authentication...</p>
      </body>
    </html>
  `);
});

export default router;
