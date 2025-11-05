import express, { type Request, type Response } from "express";
import crypto from "crypto";
import { supabase } from "../../supabaseClient.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

const router = express.Router();

// 🔹 Hjälpfunktion för PDF

export async function generateLabelPDF(order: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 300;
  const pageHeight = 400;

  // 🟡 Generera QR-kod och bädda in
  let qrImage;
  try {
    const qrDataUrl = await QRCode.toDataURL(order.order_id);
    if (!qrDataUrl.startsWith("data:image/png")) {
      throw new Error("QR-data är inte PNG");
    }
    const qrBytes = await fetch(qrDataUrl).then((res) => res.arrayBuffer());
    qrImage = await pdfDoc.embedPng(qrBytes);
  } catch (err) {
    console.error("❌ Kunde inte skapa QR-kod som PNG:", err);
    throw err;
  }

  // 🟡 Ladda logotyp och bädda in
  let logoImage;
  try {
    const logoUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/logo.png`; // Anpassa efter frontend/backend
    const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (err) {
    console.error("❌ Kunde inte ladda logotyp som PNG:", err);
    throw err;
  }

  const logoDims = logoImage.scale(0.18);

  // 📄 Text och placering – beroende på leveranssätt
  if (order.order_type === "hemleverans") {
    page.drawText(`Order ID: ${order.order_id}`, { x: 20, y: 330, size: 18, font });
    page.drawText(`Namn: ${order.name}`, { x: 20, y: 300, size: 14 });
    page.drawText(`Adress: ${order.address1}`, { x: 20, y: 280, size: 14 });
    page.drawText(`${order.postalnumber} ${order.city}`, { x: 20, y: 260, size: 14 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 230, size: 14 });
  } else {
    page.drawText(`📦 Paketbox: ${order.ombud_name}`, { x: 20, y: 330, size: 14, font });
    page.drawText(`Order ID: ${order.order_id}`, { x: 20, y: 300, size: 14 });
    page.drawText(`Adress: ${order.ombud_adress}`, { x: 20, y: 280, size: 14 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 250, size: 14 });
  }

  page.drawText(`Leverans med: Blixt Delivery`, { x: 20, y: 200, size: 14 });
  page.drawImage(logoImage, {
    x: (pageWidth - logoDims.width) / 2,
    y: 80,
    width: logoDims.width,
    height: logoDims.height,
  });

  page.drawImage(qrImage, {
    x: pageWidth - 120,
    y: 20,
    width: 80,
    height: 80,
  });

  page.drawRectangle({
    x: 10,
    y: 10,
    width: pageWidth - 20,
    height: pageHeight - 20,
    borderColor: rgb(0, 0, 0),
    borderWidth: 3,
  });

  return await pdfDoc.save();
}


// 🔹 Webhook
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

      const { data: shopRow } = await supabase
        .from("shopify_shops")
        .select("user_id")
        .eq("shop", order.source_name)
        .single();

      const userId = shopRow?.user_id ?? null;

      const shippingCode = order.shipping_lines?.[0]?.code ?? "";
      let orderType = "hemleverans";
      let ombudIndex: number | null = null;

      if (shippingCode.startsWith("blixt_box_")) {
        orderType = "ombud";
        ombudIndex = parseInt(shippingCode.replace("blixt_box_", ""), 10) - 1;
      }

      // 🔹 Kontrollera om order redan finns
const { data: existingOrder } = await supabase
  .from("orders")
  .select("id")
  .eq("shopify_order_id", order.id)
  .maybeSingle();

if (existingOrder) {
  console.warn(`⚠️ Order ${order.name} finns redan – hoppar över skapande.`);
  return res.status(200).send("Order already exists");
}

      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert([
          {
            order_type: orderType,
            shopify_order_id: order.id,
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

      if (createError || !newOrder?.[0]) {
        console.error("❌ Fel vid skapande av order:", createError);
        return res.status(500).send("Failed to save order");
      }

      let savedOrder = newOrder[0];

      // 🔹 Om ombud: koppla rätt paketskåp från kod
      if (orderType === "ombud" && ombudIndex !== null) {
        const { data: allBoxes, error: ombudError } = await supabase
          .from("paketskåp_ombud")
          .select("id, ombud_name, ombud_adress, ombud_telefon")
          .order("id", { ascending: true });

        if (ombudError || !Array.isArray(allBoxes) || !allBoxes[ombudIndex]) {
          console.warn("⚠️ Kunde inte hitta valt paketskåp");
        } else {
          const selected = allBoxes[ombudIndex];
          await supabase
            .from("orders")
            .update({
              ombud_postbox_id: selected.id,
              ombud_name: selected.ombud_name,
              ombud_adress: selected.ombud_adress,
              ombud_telefon: selected.ombud_telefon,
              status: "kommande",
            })
            .eq("id", savedOrder.id);
        }
      }

      // 🔹 Generera PDF
      const pdfBytes = await generateLabelPDF(savedOrder);
      const fileName = `etikett-order-${savedOrder.id}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("etiketter")
        .upload(fileName, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) console.error("❌ Fel vid PDF-uppladdning:", uploadError);

      const { data: publicUrlData } = supabase.storage
        .from("etiketter")
        .getPublicUrl(fileName);

      const pdfUrl = publicUrlData?.publicUrl;
      if (pdfUrl) {
        await supabase
          .from("orders")
          .update({ pdf_url: pdfUrl })
          .eq("id", savedOrder.id);
      }

      console.log("✅ Order sparad och PDF genererad!");
      res.status(200).send("OK");
    } catch (err) {
      console.error("❌ Error i orders-create webhook:", err);
      res.status(500).send("Internal server error");
    }
  }
);

export default router;