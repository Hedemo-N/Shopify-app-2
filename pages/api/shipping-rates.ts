import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../frontend/lib/supabaseClient";
import { getCoordinatesFromMapbox } from "../../frontend/lib/MapboxGeocoding";
import crypto from "crypto";

// ---- Shopify kräver RAW body ----
export const config = {
  api: {
    bodyParser: false,
  },
};

// ---- RAW BODY helper ----
async function rawBody(req: NextApiRequest): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ---- Hjälpfunktioner och konstanter (OFÖRÄNDRADE) ----
const OPENING_HOUR = 10;
const CLOSING_HOUR = 18;

const ALLOWED_POSTCODES = [
  "411 01","411 02","411 03","411 04","411 05","411 06","411 07","411 08","411 09","411 10",
  "411 11","411 12","411 13","411 14","411 15","411 16","411 17","411 18","411 19","411 20",
  "411 21","411 22","411 23","411 24","411 25","411 26","411 27","411 28","411 29","411 30",
  "411 31","411 32","411 33","411 34","411 35","411 36","411 37","411 38","411 39","411 40",
  "411 43",
  "412 48","412 49","412 50","412 51","412 52","412 53","412 54","412 55","412 56","412 57",
  "412 58","412 59","412 60","412 61","412 62","412 63","412 64","412 65","412 66","412 67",
  "412 68","412 69","412 70","412 71","412 72","412 73","412 74","412 75","412 76","412 77",
  "412 78","412 79","412 80","412 81","412 82","412 83","412 84","412 85",
  "413 01","413 02","413 03","413 04","413 05","413 06","413 07","413 08","413 09","413 10",
  "413 11","413 12","413 13","413 14","413 15","413 16","413 17","413 18","413 19","413 20",
  "413 21","413 22","413 23","413 24","413 25","413 26","413 27","413 28","413 29","413 30",
  "413 46",
  "413 90",
  "414 48","414 49","414 50","414 51","414 52","414 53","414 54","414 55","414 56","414 57",
  "414 58","414 59","414 60","414 61","414 62","414 63","414 64","414 65","414 66","414 67",
  "414 68","414 69","414 70","414 71","414 72","414 73","414 75","414 76","414 77","414 78",
  "414 79",
  "415 02",
  "415 05",
  "415 11","415 12","415 13","415 14","415 15","415 16","415 17",
  "415 22","415 23","415 24","415 25","415 26","415 27","415 28",
  "415 71",
  "416 43","416 44","416 47","416 48","416 49","416 50","416 51","416 52","416 53","416 54",
  "416 55","416 56","416 57","416 58","416 59","416 60","416 61","416 62","416 63","416 64",
  "416 65","416 66","416 67","416 68","416 69","416 70","416 71","416 72","416 73","416 74",
  "416 75","416 76","416 77","416 78","416 79","416 80","416 81","416 82","416 83",
  "417 01","417 02","417 03","417 04","417 06","417 07","417 08","417 09","417 10","417 11",
  "417 12","417 13","417 14","417 15","417 16","417 17","417 18","417 20","417 21","417 22",
  "417 23","417 24","417 25","417 26","417 30","417 39","417 40","417 41","417 50","417 51",
  "417 52","417 53","417 55","417 56","417 57","417 58","417 60","417 61","417 62","417 63",
  "417 64","417 65","417 66","417 67","417 68","417 69","417 70","417 79",

  "41101","41102","41103","41104","41105","41106","41107","41108","41109","41110",
  "41111","41112","41113","41114","41115","41116","41117","41118","41119","41120",
  "41121","41122","41123","41124","41125","41126","41127","41128","41129","41130",
  "41131","41132","41133","41134","41135","41136","41137","41138","41139","41140",
  "41143",
  "41248","41249","41250","41251","41252","41253","41254","41255","41256","41257",
  "41258","41259","41260","41261","41262","41263","41264","41265","41266","41267",
  "41268","41269","41270","41271","41272","41273","41274","41275","41276","41277",
  "41278","41279","41280","41281","41282","41283","41284","41285",
  "41301","41302","41303","41304","41305","41306","41307","41308","41309","41310",
  "41311","41312","41313","41314","41315","41316","41317","41318","41319","41320",
  "41321","41322","41323","41324","41325","41326","41327","41328","41329","41330",
  "41346",
  "41390",
  "41448","41449","41450","41451","41452","41453","41454","41455","41456","41457",
  "41458","41459","41460","41461","41462","41463","41464","41465","41466","41467",
  "41468","41469","41470","41471","41472","41473","41475","41476","41477","41478",
  "41479",
  "41502",
  "41505",
  "41511","41512","41513","41514","41515","41516","41517",
  "41522","41523","41524","41525","41526","41527","41528",
  "41571",
  "41643","41644","41647","41648","41649","41650","41651","41652","41653","41654",
  "41655","41656","41657","41658","41659","41660","41661","41662","41663","41664",
  "41665","41666","41667","41668","41669","41670","41671","41672","41673","41674",
  "41675","41676","41677","41678","41679","41680","41681","41682","41683",
  "41701","41702","41703","41704","41706","41707","41708","41709","41710","41711",
  "41712","41713","41714","41715","41716","41717","41718","41720","41721","41722",
  "41723","41724","41725","41726","41730","41739","41740","41741","41750","41751",
  "41752","41753","41755","41756","41757","41758","41760","41761","41762","41763",
  "41764","41765","41766","41767","41768","41769","41770","41779"
];

// 👇 fixa typerna
const pad = (n: number) => n.toString().padStart(2, "0");

const toOre = (
  v: number | string | null | undefined,
  fallback: number
): number => {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100);
};

interface ShopifyRate {
  service_name: string;
  service_code: string;
  total_price: string;
  currency: string;
  description: string;
  min_delivery_date?: string;
  max_delivery_date?: string;
}

// ---- HUVUDHANDLER ----
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ---- Läs RAW body ----
    const bodyBuffer = await rawBody(req);
    const payload = JSON.parse(bodyBuffer.toString());
    const headers = req.headers;

    // ---- Hämta shop domain ----
    const shopDomainRaw =
      headers["x-shopify-shop-domain"] ||
      (payload?.rate?.shop as string) ||
      payload?.shop ||
      "";

    const shopDomain = String(shopDomainRaw).trim().toLowerCase();
    if (!shopDomain) {
      return res.status(400).json({ error: "Missing shop domain" });
    }

    console.log("🔍 shop-domain:", shopDomain);

    // ---- Hämta priser & cutoff från DB ----
    const { data: shop } = await supabase
      .from("shopify_shops")
      .select(
        "pris_ombud, pris_hemkvall, pris_hem2h, number_box, cutoff_time_evening, cutoff_time_ombud"
      )
      .eq("shop", shopDomain)
      .single();

    console.log("🛒 Hittad shop:", shop);

    // ---- Kolla tillgängliga kurirer ----
    const { data: courierData } = await supabase
      .from("couriers")
      .select("user_id")
      .eq("aktiv", "aktiv")
      .eq("leveranstyp", "hemleverans");

    const couriers = courierData ?? [];
const hasAvailableCourier = couriers.length > 0;


    // ---- Priser, tider ----
    const home2h = toOre(shop?.pris_hem2h ?? 99, 9900);
    const homeEvening = toOre(shop?.pris_hemkvall ?? 65, 6500);
    const ombud = toOre(shop?.pris_ombud ?? 45, 4500);
    const boxCount = Number(shop?.number_box) || 0;

    const postcode = (payload.rate?.destination?.postal_code || "")
      .replace(/\s/g, "")
      .trim();

    if (!ALLOWED_POSTCODES.includes(postcode)) {
      console.log("⛔ Otillåtet postnummer:", postcode);
      return res.status(200).json({ rates: [] });
    }

    const street = payload.rate?.destination?.address1 || "";
    const city = payload.rate?.destination?.city || "";
    const country = payload.rate?.destination?.country || "Sweden";
    const fullAddress = `${street}, ${postcode} ${city}, ${country}`;

    // ---- DHL logic for timeslots (OFÖRÄNDRAD) ----
    const now = new Date(Date.now() + 1 * 60 * 60 * 1000);

    let slotStart: Date;
    let slotEnd: Date;
    let expressDescription: string;

    if (now.getHours() >= OPENING_HOUR && now.getHours() < CLOSING_HOUR) {
      slotStart = new Date(now);
      slotEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      expressDescription = `Cykelleverans mellan ${pad(
        slotStart.getHours()
      )}:${pad(slotStart.getMinutes())}–${pad(slotEnd.getHours())}:${pad(
        slotEnd.getMinutes()
      )}`;
    } else {
      slotStart = new Date(now);
      if (now.getHours() >= CLOSING_HOUR) slotStart.setDate(now.getDate() + 1);
      slotStart.setHours(OPENING_HOUR, 0, 0, 0);

      slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000);
      expressDescription = `Cykelleverans vid öppning (${pad(
        slotStart.getHours()
      )}:${pad(slotStart.getMinutes())}–${pad(slotEnd.getHours())}:${pad(
        slotEnd.getMinutes()
      )})`;
    }

    const rates: ShopifyRate[] = [];

    // ---- 2h EXPRESS ----
    if (hasAvailableCourier) {
      rates.push({
        service_name: "🌱BLIXT EXPRESS Hemleverans inom 2 timmar🌱",
        service_code: "blixt_home_2h",
        total_price: String(home2h),
        currency: "SEK",
        description: expressDescription,
        min_delivery_date: slotStart.toISOString(),
        max_delivery_date: slotEnd.toISOString(),
      });
    }

    // ---- Kvällsleverans ----
    rates.push({
      service_name: "🌱BLIXT Hemleverans kväll 17–22🌱",
      service_code: "blixt_home_evening",
      total_price: String(homeEvening),
      currency: "SEK",
      description: "Leverans ikväll om du beställer i tid",
      min_delivery_date: slotStart.toISOString(),
      max_delivery_date: slotEnd.toISOString(),
    });

    // ---- Ombud / Paketbox ----
    if (boxCount > 0) {
      const coords = await getCoordinatesFromMapbox(fullAddress);

      if (coords) {
        const { data: allBoxes } = await supabase
          .from("paketskåp_ombud")
          .select("id, ombud_name, ombud_adress, ombud_telefon, lat_long");

        if (allBoxes?.length) {
          const parseLatLng = (str: string) => {
            const [lat, lng] = str.split(",").map(Number);
            return { latitude: lat, longitude: lng };
          };

          const toDistance = (a: number, b: number, c: number, d: number) => {
            const R = 6371e3;
            const φ1 = (a * Math.PI) / 180;
            const φ2 = (c * Math.PI) / 180;
            const Δφ = ((c - a) * Math.PI) / 180;
            const Δλ = ((d - b) * Math.PI) / 180;

            const sh =
              Math.sin(Δφ / 2) ** 2 +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

            return R * 2 * Math.atan2(Math.sqrt(sh), Math.sqrt(1 - sh));
          };

          const closest = allBoxes
            .map((box) => {
              const { latitude, longitude } = parseLatLng(box.lat_long);
              return {
                ...box,
                distance: toDistance(
                  coords.latitude,
                  coords.longitude,
                  latitude,
                  longitude
                ),
              };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, boxCount);

          closest.forEach((box, idx) => {
            const dt = new Date(now.getTime() + 4 * 60 * 60 * 1000);
            rates.push({
              service_name: `📦BLIXT Ombud ${idx + 1} ${box.ombud_name} (${Math.round(
                box.distance
              )} m)`,
              service_code: `blixt_box_${box.id}`,
              total_price: String(ombud),
              currency: "SEK",
              description: "Leverans till paketbox",
              min_delivery_date: dt.toISOString(),
              max_delivery_date: dt.toISOString(),
            });
          });
        }
      }
    }

    return res.status(200).json({ rates });
  } catch (err) {
    console.error("❌ shipping-rates error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}