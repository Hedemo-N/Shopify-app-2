import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { supabase } from "../../../frontend/lib/supabaseClient";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";


export const config = {
  api: {
    bodyParser: false, // Shopify kräver RAW body
  },
};

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ---- PDF generator ----
export async function generateLabelPDF(order: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([300, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 300;
  const pageHeight = 400;

  // Hämta logo
  const logoUrl = `${process.env.SHOPIFY_APP_URL}/logo.png`;
  const logoResponse = await fetch(logoUrl);
  const logoBytes = Buffer.from(await logoResponse.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);
  
  // Använd fast storlek för loggan istället för scale
  const logoWidth = 50;
  const logoHeight = 50;

  // QR-kod
  const qrDataUrl = await QRCode.toDataURL(order.order_id);
  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, "");
  const qrBytes = Uint8Array.from(Buffer.from(qrBase64, "base64"));
  const qrImage = await pdfDoc.embedPng(qrBytes);

  if (order.order_type === "hemleverans" || order.order_type === "kvällsleverans") {
    const leveransText =
      order.order_type === "kvällsleverans" ? "Kvällsleverans" : "Hemleverans";

    page.drawText(`${leveransText}`, { x: 20, y: 370, size: 20, font });
    page.drawText("Order ID:", { x: 20, y: 350, size: 25, font });
    page.drawText(`${order.order_id}`, { x: 20, y: 320, size: 25, font });

    page.drawText(`Namn: ${order.name}`, { x: 20, y: 280, size: 15 });
    page.drawText(`Adress: ${order.address1}`, { x: 20, y: 260, size: 15 });
    page.drawText(`${order.postalnumber} ${order.city}`, { x: 20, y: 240, size: 15 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 200, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 170, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 130, size: 25 });

    page.drawImage(logoImage, {
      x: (pageWidth - logoWidth) / 2,
      y: 60,
      width: logoWidth,
      height: logoHeight,
    });

    page.drawImage(qrImage, {
      x: pageWidth - 110,
      y: 15,
      width: 100,
      height: 100,
    });
  } else {
    page.drawText("Ombud/Paketbox", { x: 20, y: 350, size: 20, font });
    page.drawText(`${order.ombud_name || ""}`, { x: 20, y: 310, size: 20, font });

    page.drawText("Order ID:", { x: 20, y: 275, size: 20, font });
    page.drawText(`${order.order_id}`, { x: 20, y: 255, size: 20, font });

    page.drawText(`Namn: ${order.name}`, { x: 20, y: 235, size: 15 });
    page.drawText(`Adress: ${order.ombud_adress || ""}`, { x: 20, y: 210, size: 15 });
    page.drawText(`Telefon: ${order.phone}`, { x: 20, y: 160, size: 15 });
    page.drawText(`Leverans med:`, { x: 20, y: 135, size: 15 });
    page.drawText(`Blixt Delivery`, { x: 20, y: 110, size: 25 });

    page.drawImage(logoImage, {
      x: (pageWidth - logoWidth) / 2,
      y: 60,
      width: logoWidth,
      height: logoHeight,
    });

    page.drawImage(qrImage, {
      x: pageWidth - 100,
      y: 15,
      width: 80,
      height: 80,
    });
  }

  // Rita ram runt hela etiketten
  page.drawRectangle({
    x: 10,
    y: 10,
    width: pageWidth - 20,
    height: pageHeight - 20,
    borderColor: rgb(0, 0, 0),
    borderWidth: 4,
  });

  return await pdfDoc.save();
}

// ---- MAIN WEBHOOK HANDLER ----
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const rawBody = await buffer(req);
  const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;

  try {
    // ---- HMAC VALIDATION ----
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
      .update(rawBody)
      .digest("base64");

    if (generatedHmac !== hmacHeader) {
      console.error("❌ HMAC mismatch!");
      return res.status(401).send("Unauthorized");
    }

    const order = JSON.parse(rawBody.toString());
    console.log("🧾 Ny order från Shopify:", order.name);
    console.log("📦 Full Shopify-order:", JSON.stringify(order, null, 2));

    const shopDomain = req.headers["x-shopify-shop-domain"] as string;
    console.log("RAW SHOP DOMAIN HEADER →", shopDomain);

    // ---- Hämta butik från profiles ----
    const { data: shopRow, error: shopError } = await supabase
      .from("profiles")
      .select("_id, Butiksadress, Butiksemail")
      .eq("shop", shopDomain?.toLowerCase())
      .single();

    if (shopError || !shopRow) {
      console.warn("⚠️ Kunde inte hitta butik i profiles för domän:", shopDomain);
    }
    console.log("🔗 Kopplad profil:", shopRow?._id);

    // ---- Bestäm leveranstyp ----
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
    } else if (shippingCode === "blixt_home_evening") {
      orderType = "kvällsleverans";
    }

    // ---- Kontrollera om order redan finns ----
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("shopify_order_id", order.id)
      .maybeSingle();

    if (existingOrder) {
      console.warn(`⚠️ Order ${order.name} finns redan – hoppar över skapande.`);
      return res.status(200).send("Order already exists");
    }

    // ---- Skapa order ----
    const { data: newOrder, error: createError } = await supabase
      .from("orders")
      .insert([
        {
          order_type: orderType,
          shopify_order_id: order.id,
          source: "shopify",
          name: `${order.shipping_address?.first_name ?? ""} ${
            order.shipping_address?.last_name ?? ""
          }`,
          address1: order.shipping_address?.address1 ?? "",
          postalnumber: order.shipping_address?.zip ?? "",
          city: order.shipping_address?.city ?? "",
          phone:
            order.shipping_address?.phone ||
            order.customer?.phone ||
            order.phone ||
            "",
          custom_field: order.note ?? "",
          user_id: shopRow?._id,
          ordercreatedtime: new Date().toISOString(),
          numberofkollin: order.line_items?.length ?? 1,
          status: "kommande",
        },
      ])
      .select();

    if (createError || !newOrder?.[0]) {
      console.error("❌ Fel vid skapande av order:", createError);
      return res.status(500).send("Failed to save order");
    }

    let savedOrder = newOrder[0];

    // ---- Ombud: koppla box ----
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

    // ---- Hämta full order igen ----
    const { data: updatedOrder, error: refetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", savedOrder.id)
      .single();

    if (refetchError || !updatedOrder) {
      console.error("❌ Kunde inte hämta uppdaterad order:", refetchError);
      return res.status(500).send("Failed to fetch updated order");
    }

    savedOrder = updatedOrder;

    // ---- Kurirtilldelning (hemleverans) ----
    if (savedOrder.order_type === "hemleverans") {
      const { data: couriers, error: courierError } = await supabase
        .from("couriers")
        .select("user_id, last_eta")
        .eq("aktiv", "aktiv")
        .eq("leveranstyp", "hemleverans");

      if (!couriers || courierError) {
        console.warn("⚠️ Inga aktiva kurirer tillgängliga för hemleverans.");
      } else {
        const butikensAdress = shopRow?.Butiksadress;
        let matchedCourier = null;

        // Match med samma butiksadress
        for (const courier of couriers) {
          const { data: courierOrders } = await supabase
            .from("orders_primary")
            .select("Butiksadress")
            .eq("kurir_id", courier.user_id)
            .in("status", ["kommande"]);

          const hasSame = courierOrders?.some(
            (o) => o.Butiksadress === butikensAdress
          );

          if (hasSame) {
            matchedCourier = courier;
            break;
          }
        }

        // Ingen match → ta lägst ETA
        if (!matchedCourier) {
          matchedCourier = couriers.reduce((prev, curr) => {
            const prevEta = prev.last_eta || "99:99";
            const currEta = curr.last_eta || "99:99";
            return prevEta < currEta ? prev : curr;
          });
        }

        await supabase
          .from("orders")
          .update({
            kurir_id: matchedCourier.user_id,
            status: "kommande",
          })
          .eq("id", savedOrder.id);

        console.log(`🚴 Kurir tilldelad: ${matchedCourier.user_id}`);
      }
    }

    // ---- Generera PDF ----
    console.log("📦 Fullständig order till PDF:", savedOrder);

    const pdfBytes = await generateLabelPDF(savedOrder);
    const fileName = `etikett-order-${savedOrder.id}.pdf`;

    // ---- Uploadar PDF ----
    const { error: uploadError } = await supabase.storage
      .from("etiketter")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Fel vid uppladdning av PDF:", uploadError);
      return res.status(500).send("Failed upload");
    }

    // ---- Publik URL ----
    const { data: publicUrlData } = supabase.storage
      .from("etiketter")
      .getPublicUrl(fileName);

    const pdfUrl = publicUrlData?.publicUrl;

    if (pdfUrl) {
      await supabase
        .from("orders")
        .update({ pdf_url: pdfUrl })
        .eq("id", savedOrder.id);

      // ---- Skicka email ----
      const shopEmail = shopRow?.Butiksemail;

      const emailPayload = {
        to: shopEmail,
        labelUrl: pdfUrl,
        orderId: savedOrder.order_id,
        customerName: savedOrder.name,
      };

      const hmac = crypto
        .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
        .update(JSON.stringify(emailPayload), "utf8")
        .digest("hex");

      if (shopEmail) {
        try {
          const emailRes = await fetch(
            `${process.env.SHOPIFY_APP_URL}/api/webhooks/send-label-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Custom-HMAC": hmac,
              },
              body: JSON.stringify(emailPayload),
            }
          );

          const result = await emailRes.json();
          console.log("📧 E-post skickad med etikett:", result);
        } catch (err) {
          console.error("❌ Misslyckades skicka etikettmail:", err);
        }
      }

      console.log("✅ PDF sparad och länk uppdaterad:", pdfUrl);
    }

    // ---- Klart ----
    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Error i orders-create webhook:", err);
    return res.status(500).send("Internal server error");
  }
}