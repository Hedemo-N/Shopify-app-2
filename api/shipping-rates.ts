import express from "express";
import type { Request, Response } from "express";
import { supabase } from "../supabaseClient.js";
import { getCoordinatesFromMapbox } from "../utils/MapboxGeocoding.js";

const router = express.Router();

const OPENING_HOUR = 10;
const CLOSING_HOUR = 18;
// ✅ tillåtna postnummer (förkortad lista – lägg till hela din)
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
const pad = (n: number): string => n.toString().padStart(2, "0");

const toOre = (v: number | string | null | undefined, fallback: number): number => {
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

router.post("/api/shipping-rates", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as any;
    const headers = req.headers as Record<string, string | undefined>;

    const shopDomain: string | null =
      headers["x-shopify-shop-domain"] ||
      payload?.rate?.shop ||
      payload?.shop ||
      null;

    if (!shopDomain) {
      res.status(400).json({ error: "Missing shop domain" });
      return;
    }

    const { data: shop } = await supabase
      .from("shopify_shops")
      .select("user_id")
      .eq("shop", shopDomain)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("pris_ombud, pris_hemkvall, pris_hem2h, number_box")
      .eq("_id", shop?.user_id)
      .single();

    const home2h = toOre(profile?.pris_hem2h ?? 99, 9900);
    const homeEvening = toOre(profile?.pris_hemkvall ?? 65, 6500);
    const ombud = toOre(profile?.pris_ombud ?? 45, 4500);
    const boxCount = Number(profile?.number_box) || 0;

    const postcode = (payload?.rate?.destination?.postal_code || "").replace(/\s/g, "");
    if (!ALLOWED_POSTCODES.includes(postcode)) {
      console.log(`⛔ Postnummer ${postcode} ej tillåtet`);
      res.status(200).json({ rates: [] });
      return;
    }

    const now = new Date();
    let slotStart: Date;
    let slotEnd: Date;
    let expressDescription: string;

    if (now.getHours() >= OPENING_HOUR && now.getHours() < CLOSING_HOUR) {
      slotStart = new Date(now);
      slotEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      if (slotEnd.getHours() >= CLOSING_HOUR) slotEnd.setHours(CLOSING_HOUR, 0, 0, 0);
      expressDescription = `Cykelleverans mellan ${pad(slotStart.getHours())}–${pad(slotEnd.getHours())}`;
    } else {
      slotStart = new Date(now);
      if (now.getHours() >= CLOSING_HOUR) slotStart.setDate(now.getDate() + 1);
      slotStart.setHours(OPENING_HOUR, 0, 0, 0);
      slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000);
      expressDescription = `Cykelleverans vid öppning (${pad(slotStart.getHours())}–${pad(slotEnd.getHours())})`;
    }

    const rates: ShopifyRate[] = [
      {
        service_name: "🚴‍♂️ Blixt Hem inom 2h",
        service_code: "blixt_home_2h",
        total_price: String(home2h),
        currency: "SEK",
        description: expressDescription,
        min_delivery_date: slotStart.toISOString(),
        max_delivery_date: slotEnd.toISOString(),
      },
      {
        service_name: "🌆 Blixt Kväll (17–21)",
        service_code: "blixt_home_evening",
        total_price: String(homeEvening),
        currency: "SEK",
        description: "Leverans samma kväll",
        min_delivery_date: slotStart.toISOString(),
        max_delivery_date: slotEnd.toISOString(),
      },
    ];

    // 👇 Hämta paketskåp om antal > 0
 // 👇 Hämta paketskåp om antal > 0
if (boxCount > 0) {
  console.log(`📦 Försöker hämta ${boxCount} paketskåp för postnummer ${postcode}`);
  const location = await getCoordinatesFromMapbox(`${postcode} Sweden`);

  console.log("📍 Hämtade koordinater:", location);

  if (location) {
    const { data: allBoxes, error } = await supabase
      .from("paketskåp_ombud")
      .select("id, ombud_name, ombud_adress, ombud_telefon, lat_long");

    if (error) {
      console.error("❌ Fel vid hämtning av paketskåp:", error);
    } else if (Array.isArray(allBoxes) && allBoxes.length > 0) {
     const parseLatLng = (text: string): { lat: number; lng: number } | null => {
  const [lng, lat] = text?.split(",")?.map(Number); // 🔁 OBS: byt plats här!
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};


      const toDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

    const closest = allBoxes
  .map((box) => {
    const coords = parseLatLng(box.lat_long);
    if (!coords) return null;
    const distance = toDistance(location.latitude, location.longitude, coords.lat, coords.lng);
    return { ...box, distance };
  })
  .filter((box): box is NonNullable<typeof box> => box !== null)
  .sort((a, b) => a.distance - b.distance)
  .slice(0, boxCount);


      console.log(`📦 Hittade ${closest.length} närliggande paketskåp`);

      closest.forEach((box, index) => {
        console.log(`➡️ Skåp #${index + 1}:`, box);
        console.log("✅ Nu använder vi ombud_name i service_name");

        rates.push({
          service_name: `📦 ${box.ombud_name || "Paketskåp"}`,
          service_code: `blixt_box_${index + 1}`,
          total_price: String(ombud),
          currency: "SEK",
          description: box.ombud_adress || "Paketskåp i närheten",
          min_delivery_date: now.toISOString(),
          max_delivery_date: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
        });
      });
    } else {
      console.warn("⚠️ Inga paketskåp hittades – lägger till fallback-ombud");
      console.log("✅ Nu använder vi ombud_name i service_name");

      rates.push({
        service_name: "📦 Blixt Ombud/Paketskåp",
        service_code: "blixt_ombud",
        total_price: String(ombud),
        currency: "SEK",
        description: "Leverans till närmaste paketskåp",
        min_delivery_date: now.toISOString(),
        max_delivery_date: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      });
    }
  } else {
    console.error("❌ Kunde inte hämta koordinater för postnummer:", postcode);
  }




      
    }

    console.log(`📬 Shopify callback från ${shopDomain}:`, rates);
    res.status(200).json({ rates });
  } catch (error) {
    console.error("❌ Error in shipping-rates:", error);
    res.status(500).json({ error: "Failed to calculate rates" });
  }
});

export default router;