import express, { type Request, type Response } from "express";
import crypto from "crypto";
import { supabase } from "../../supabaseClient.js";

const router = express.Router();

router.post(
  "/api/webhooks/orders-create",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
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

      // 🔹 Hämta rätt user_id för butiken
      const { data: shopRow } = await supabase
        .from("shopify_shops")
        .select("user_id")
        .eq("shop", order.source_name)
        .single();

      const userId = shopRow?.user_id ?? null;

      // 🔹 Skapa order med samma struktur som BokaOrderPage
      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert([
          {
            order_type:
              order.shipping_lines?.[0]?.title?.toLowerCase().includes("ombud") ?
              "ombud" : "hemleverans",
            name: `${order.shipping_address?.first_name ?? ""} ${order.shipping_address?.last_name ?? ""}`,
            address1: order.shipping_address?.address1 ?? "",
            postalnumber: order.shipping_address?.zip ?? "",
            city: order.shipping_address?.city ?? "",
            phone: order.shipping_address?.phone ?? "",
            custom_field: order.note ?? "",
            user_id: userId,
            ordercreatedtime: new Date().toISOString(),
            numberofkollin: order.line_items?.length ?? 1,
            status: "pending",
          },
        ])
        .select();

      if (insertError || !newOrder?.[0]) {
        console.error("❌ Fel vid skapande av order:", insertError);
        return res.status(500).send("Failed to save order");
      }

      console.log("✅ Order sparad i Supabase med ID:", newOrder[0].id);
      res.status(200).send("OK");
    } catch (err) {
      console.error("❌ Error i orders-create webhook:", err);
      res.status(500).send("Internal server error");
    }
  }
);

export default router;
