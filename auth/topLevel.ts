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
    sameSite: "none",
  });

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Content-Type", "text/html");

  res.send(`
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <script>
          if (window.top === window.self) {
            window.location.href = "${process.env.SHOPIFY_APP_URL}/auth?shop=${shop}&host=${host}";
          } else {
            window.top.location.href = "${process.env.SHOPIFY_APP_URL}/auth/toplevel?shop=${shop}&host=${host}";
          }
        </script>
      </body>
    </html>
  `);
});

export default router;
