import express, { type Request, type Response } from "express";
import crypto from "crypto";
import { supabase } from "../../supabaseClient.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { getCoordinatesFromMapbox } from "../../utils/MapboxGeocoding.js";

const router = express.Router();

// 🧭 Typer
type Coordinates = { latitude: number; longitude: number };
type Ombud = {
  id: string;
  ombud_adress: string;
  ombud_name: string;
  ombud_telefon: string;
};

// 🔹 Hjälpfunktion för närmaste ombud
async function fetchPaketskåp(): Promise<Ombud[]> {
  const { data, error } = await supabase
    .from("paketskåp_ombud")
    .select("id, ombud_adress, lat_long, ombud_name, ombud_telefon");
  if (error) {
    console.error("Fel vid hämtning av paketskåp:", error);
    return [];
  }
  return data || [];
}

function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371e3;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findNearestOmbud(customerAddress: string): Promise<Ombud | null> {
  const customerCoords = await getCoordinatesFromMapbox(customerAddress);
  if (!customerCoords) return null;

  const list = await fetchPaketskåp();
  let nearest: Ombud | null = null;
  let minDist = Infinity;

  for (const paket of list) {
    const coords = await getCoordinatesFromMapbox(paket.ombud_adress);
    if (!coords) continue;
    const dist = haversineDistance(customerCoords, coords);
    if (dist < minDist) {
      minDist = dist;
      nearest = paket;
    }
  }

  return nearest;
}

// 🔹 Hjälpfunktion för PDF
async function generateLabelPDF(order: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 300;
  const pageHeight = 400;

  const qrDataUrl = await QRCode.toDataURL(order.order_id);
  const qrBytes = await fetch(qrDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrBytes);

  const logoUrl = `${process.env.SHOPIFY_APP_URL}/logo.png`;
  const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoDims = logoImage.scale(0.18);

  page.drawText(`Order ID: ${order.order_id}`, { x: 20, y: 330, size: 18, font });
  page.drawText(`Namn: ${order.name}`, { x: 20, y: 300, size: 14 });
  page.drawText(`Adress: ${order.address1}`, { x: 20, y: 280, size: 14 });
  page.drawText(`${order.postalnumber} ${order.city}`, { x: 20, y: 260, size: 14 });
  page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 230, size: 14 });
  page.drawText(`Leverans med: Blixt Delivery`, { x: 20, y: 200, size: 14 });

  page.drawImage(logoImage, {
    x: (pageWidth - logoDims.width) / 2,
    y: 60,
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

  return pdfDoc.save();
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

      const orderType =
        order.shipping_lines?.[0]?.title?.toLowerCase().includes("ombud")
          ? "ombud"
          : "hemleverans";

      const { data: newOrder, error: createError } = await supabase
        .from("orders")
        .insert([
          {
            order_type: orderType,
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

      // 🔹 Om ombud: hitta närmaste paketskåp
      if (orderType === "ombud") {
        const fullAddress = `${savedOrder.address1}, ${savedOrder.postalnumber} ${savedOrder.city}`;
        const nearest = await findNearestOmbud(fullAddress);

        if (nearest) {
          await supabase
            .from("orders")
            .update({
              ombud_postbox_id: nearest.id,
              ombud_name: nearest.ombud_name,
              ombud_adress: nearest.ombud_adress,
              ombud_telefon: nearest.ombud_telefon,
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
