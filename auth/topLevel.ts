import express from "express";

const router = express.Router();

router.get("/auth/toplevel", (req, res) => {
  const { shop, host } = req.query;

  if (!shop || !host) {
    return res.status(400).send("Missing shop or host");
  }

  res.cookie("shopifyTopLevelOAuth", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  // 🔧 Shopify Admin blockerar window.top.location — använd meta refresh
  res.setHeader("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0;url=/auth?shop=${shop}&host=${host}">
      </head>
      <body>
        <p>Redirecting to authentication...</p>
      </body>
    </html>
  `);
});

export default router;
