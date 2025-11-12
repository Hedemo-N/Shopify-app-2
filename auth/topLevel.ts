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

  res.setHeader("Content-Type", "text/html");
res.send(`
  <!DOCTYPE html>
  <html>
    <head>
      <script>
        window.top.location.href = "/auth?shop=${shop}&host=${host}";
      </script>
    </head>
    <body></body>
  </html>
`);

});

export default router;
