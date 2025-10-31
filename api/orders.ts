import express from "express";
import fetch from "node-fetch";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// 🧩 Hämta ordrar för butik
router.get("/orders", async (req, res) => {
  try {
    const shop =
      req.query.shop ||
      req.headers["x-shopify-shop-domain"] ||
      req.headers["X-Shopify-Shop-Domain"];

    if (!shop) {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    // 🔑 Hämta access token från Supabase
    const { data: shopData, error: shopError } = await supabase
      .from("shopify_shops")
      .select("access_token")
      .eq("shop", shop)
      .single();

    if (shopError || !shopData) {
      console.error("❌ Hittade inte token:", shopError);
      return res.status(404).json({ error: "No token found for shop" });
    }

    const token = shopData.access_token;

    // 🔗 Shopify Orders API
    const response = await fetch(
      `https://${shop}/admin/api/2024-07/orders.json?status=any&limit=10`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("❌ Shopify API-fel:", text);
      return res.status(response.status).send(text);
    }

    const data = (await response.json()) as { orders: any[] };


    // 📦 Anpassa formatet till din struktur
    const formattedOrders = data.orders.map((o: any) => ({
      order_id: o.id,
      name: o.name,
      address1: o.shipping_address?.address1 || "",
      postalnumber: o.shipping_address?.zip || "",
      city: o.shipping_address?.city || "",
      phone: o.shipping_address?.phone || "",
      email: o.email,
      comment: o.note,
      total_price: o.total_price,
      order_type: "hemleverans", // just nu default
      status: o.fulfillment_status || "pending",
      created_at: o.created_at,
    }));

    return res.json({ orders: formattedOrders });
  } catch (err) {
    console.error("❌ API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
