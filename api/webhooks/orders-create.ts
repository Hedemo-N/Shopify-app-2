import express, { type Request, type Response } from "express";
import crypto from "crypto";
import { supabase } from "../../supabaseClient.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { readFile } from "fs/promises";
import path from "path";
import { Buffer } from "buffer";


// ...


const router = express.Router();

// 🔹 Hjälpfunktion för PDF

export async function generateLabelPDF(order: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 300;
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBytes = await readFile(logoPath);
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoDims = logoImage.scale(0.18);

  const qrDataUrl = await QRCode.toDataURL(order.order_id);
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBytes = Uint8Array.from(Buffer.from(qrBase64, "base64"));
  const qrImage = await pdfDoc.embedPng(qrBytes);

  if (order.order_type === "hemleverans") {
    page.drawText("Order ID:", { x: 20, y: 350, size: 25, font });
    page.drawText(`${order.order_id}`, { x: 20, y: 320, size: 25, font });

    page.drawText(`Namn: ${order.name}`, { x: 20, y: 280, size: 15 });
    page.drawText(`Adress: ${order.address1}`, { x: 20, y: 260, size: 15 });
    page.drawText(`${order.postalnumber} ${order.city}`, { x: 20, y: 240, size: 15 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 200, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 170, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 130, size: 25 });

    page.drawImage(logoImage, {
      x: (pageWidth - logoDims.width) / 2,
      y: 100,
      width: logoDims.width,
      height: logoDims.height,
    });

    page.drawImage(qrImage, {
      x: pageWidth - 200,
      y: 15,
      width: 100,
      height: 100,
    });
  } else {
    page.drawText("Ombud/Paketbox", { x: 20, y: 350, size: 20, font });
    page.drawText(`${order.ombud_name}`, { x: 20, y: 310, size: 20, font });

    page.drawText("Order ID:", { x: 20, y: 275, size: 20, font });
    page.drawText(`${order.order_id}`, { x: 20, y: 255, size: 20, font });

    page.drawText(`Namn: ${order.name}`, { x: 20, y: 235, size: 15 });
    page.drawText(`Adress: ${order.ombud_adress}`, { x: 20, y: 210, size: 15 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 160, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 135, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 110, size: 25 });

    page.drawImage(logoImage, {
      x: (pageWidth - logoDims.width) / 2,
      y: 100,
      width: logoDims.width,
      height: logoDims.height,
    });

    page.drawImage(qrImage, {
      x: pageWidth - 200,
      y: 15,
      width: 80,
      height: 80,
    });
  }

  page.drawRectangle({
    x: 10,
    y: 10,
    width: pageWidth - 20,
    height: 380,
    borderColor: rgb(0, 0, 0),
    borderWidth: 4,
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
      console.log("📦 Full Shopify-order:", JSON.stringify(order, null, 2));
      const shopDomain = req.get("X-Shopify-Shop-Domain"); // 👈 e.g. "hedens-skor.myshopify.com"


    const { data: shopRow, error: shopError } = await supabase
  .from("shopify_shops")
  .select("user_id")
  .eq("shop", shopDomain)
  .single();

if (shopError || !shopRow) {
  console.warn("⚠️ Kunde inte hitta butik i shopify_shops för domän:", shopDomain);
}

const userId = shopRow?.user_id ?? null;
console.log("🔗 Kopplad user_id från shopify_shops:", userId);

      const shippingCode = order.shipping_lines?.[0]?.code ?? "";
      let orderType = "hemleverans";
     let selectedBox = null;
if (shippingCode.startsWith("blixt_box_")) {
  orderType = "ombud";
  
  const boxId = parseInt(shippingCode.replace("blixt_box_", ""), 10);
  const { data: boxData } = await supabase
    .from("paketskåp_ombud")
    .select("id, ombud_name, ombud_adress, ombud_telefon")
    .eq("id", boxId)
    .single();

  selectedBox = boxData;

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
            phone:
            order.shipping_address?.phone ||
            order.customer?.phone ||
            order.phone ||
            "",
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
if (orderType === "ombud" && selectedBox) {
  await supabase
    .from("orders")
    .update({
      ombud_postbox_id: selectedBox.id,
      ombud_name: selectedBox.ombud_name,
      ombud_adress: selectedBox.ombud_adress,
      ombud_telefon: selectedBox.ombud_telefon,
      status: "kommande",
    })
    .eq("id", savedOrder.id);
}
// 🔁 Hämta uppdaterad order med ombudsinformation
const { data: updatedOrder, error: refetchError } = await supabase
  .from("orders")
  .select("*")
  .eq("id", savedOrder.id)
  .single();

if (refetchError || !updatedOrder) {
  console.error("❌ Kunde inte hämta uppdaterad order:", refetchError);
  return res.status(500).send("Failed to fetch updated order");
}

savedOrder = updatedOrder; // ersätt gamla savedOrder med den fulla versionen




      // 🔹 Generera PDF
  
console.log("📦 Fullständig order till PDF:", savedOrder);

const pdfBytes = await generateLabelPDF(savedOrder);
const fileName = `etikett-order-${savedOrder.id}.pdf`;


// 🔼 Ladda upp PDF till Supabase Storage
const { error: uploadError } = await supabase.storage
  .from("etiketter")
  .upload(fileName, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });

if (uploadError) {
  console.error("❌ Fel vid uppladdning av PDF:", uploadError);
  return;
}

// 🌐 Hämta publika länken till PDF
const { data: publicUrlData } = supabase.storage
  .from("etiketter")
  .getPublicUrl(fileName);

const pdfUrl = publicUrlData?.publicUrl;
if (pdfUrl) {
  await supabase
  .from("orders")
  .update({ pdf_url: pdfUrl })
  .eq("id", savedOrder.id);

  console.log("✅ PDF sparad och länk uppdaterad i databasen:", pdfUrl);
}
      // Svara till Shopify när allt är klart
      res.status(200).send("OK");
    } catch (err) {
      console.error("❌ Error i orders-create webhook:", err);
      res.status(500).send("Internal server error");
    }
  }
);


export default router;