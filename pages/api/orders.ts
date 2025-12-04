import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../frontend/lib/supabaseClient";

export const config = {
  api: {
    bodyParser: true, // vanlig JSON
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🏪 Hämta butik från query eller header
    const shop =
      (req.query.shop as string) ||
      (req.headers["x-shopify-shop-domain"] as string) ||
      (req.headers["X-Shopify-Shop-Domain"] as string);

    if (!shop) {
      return res.status(400).json({ error: "Missing shop parameter" });
    }

    // 🔑 Hämta access token från Supabase
    const { data: shopData, error: shopError } = await supabase
      .from("profiles")
      .select("access_token_shopify")
      .eq("shop", shop)
      .single();

    if (shopError || !shopData) {
      console.error("❌ Kunde inte hitta access_token:", shopError);
      return res.status(404).json({ error: "No token found for shop" });
    }

    const token = shopData.access_token_shopify;

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
      console.error("❌ Shopify API response fel:", text);
      return res.status(response.status).send(text);
    }

    const data = (await response.json()) as { orders: any[] };

    // 📦 Anpassa formatet till ditt system
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

    return res.status(200).json({ orders: formattedOrders });
  } catch (err) {
    console.error("❌ /api/orders error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
