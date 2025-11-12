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
    <body>
      <form id="redirectForm" method="GET" action="${process.env.SHOPIFY_APP_URL}/auth">
        <input type="hidden" name="shop" value="${shop}" />
        <input type="hidden" name="host" value="${host}" />
      </form>
      <script>
        document.getElementById("redirectForm").target = "_top";
        document.getElementById("redirectForm").submit();
      </script>
    </body>
  </html>
`);

});

export default router;
