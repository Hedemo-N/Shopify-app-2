import express from "express";
import type { Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

// ✅ Shopify skickar POST till denna när en order skapas
router.post("/api/webhooks/orders-create", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256") as string;
  const body = req.body;

  try {
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(body, "utf8")
      .digest("base64");

    if (generatedHmac !== hmacHeader) {
      console.error("❌ HMAC mismatch!");
      return res.status(401).send("Unauthorized");
    }

    const order = JSON.parse(body.toString());

    console.log("🧾 Ny order från Shopify:", order.name);
const { data: shopRow } = await supabase
  .from("shopify_shops")
  .select("user_id")
  .eq("shop", order.source_name)
  .single();

const userId = shopRow?.user_id ?? null;

    // --- Spara till Supabase ---
    const { error } = await supabase.from("orders").insert([
  {
    order_id: order.id,
    name: `${order.shipping_address?.first_name ?? ""} ${order.shipping_address?.last_name ?? ""}`,
    address1: order.shipping_address?.address1 ?? "",
    postalnumber: order.shipping_address?.zip ?? "",
    city: order.shipping_address?.city ?? "",
    phone: order.shipping_address?.phone ?? "",
    order_type: "hemleverans",
    status: "paid",
    total_price: order.total_price,
    ordercreatedtime: new Date().toISOString(),
    user_id: userId,
  },
]);


    if (error) {
      console.error("❌ Supabase insert error:", error);
      return res.status(500).send("Failed to save order");
    }

    console.log("✅ Order sparad i Supabase!");
    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error in orders-create webhook:", err);
    res.status(500).send("Internal server error");
  }
});

export default router;
