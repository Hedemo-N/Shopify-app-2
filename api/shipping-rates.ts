import express from "express";
import type { Request, Response } from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// 🕙 öppettider
const OPENING_HOUR = 10;
const CLOSING_HOUR = 18;

// ✅ tillåtna postnummer (förkortad lista – lägg till hela din)
const ALLOWED_POSTCODES: string[] = [
  "41103", "41253", "41301", "41451", "41511", "41655", "41702",
];

// 👇 fixa typerna
const pad = (n: number): string => n.toString().padStart(2, "0");

const toOre = (v: number | string | null | undefined, fallback: number): number => {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100);
};

// Typdefinition för varje rate (för bättre intellisense)
interface ShopifyRate {
  service_name: string;
  service_code: string;
  total_price: string;
  currency: string;
  description: string;
  min_delivery_date?: string;
  max_delivery_date?: string;
}

// 🚀 Huvudrouten
router.post("/api/shipping-rates", async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as any; // Shopify skickar JSON utan fast schema
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

    // 🏬 Hämta butiksinfo
    const { data: shop } = await supabase
      .from("shopify_shops")
      .select("user_id")
      .eq("shop", shopDomain)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("pris_ombud, pris_hemkvall, pris_hem2h")
      .eq("_id", shop?.user_id)
      .single();

    // 💰 priser (öre)
    const home2h: number = toOre(profile?.pris_hem2h ?? 99, 9900);
    const homeEvening: number = toOre(profile?.pris_hemkvall ?? 65, 6500);
    const ombud: number = toOre(profile?.pris_ombud ?? 45, 4500);

    // 📬 postnummerfilter
    const postcode = (payload?.rate?.destination?.postal_code || "").replace(/\s/g, "");
    if (!ALLOWED_POSTCODES.includes(postcode)) {
      console.log(`⛔ Postnummer ${postcode} ej tillåtet`);
      res.status(200).json({ rates: [] });
      return;
    }

    // ⏰ leveransfönster
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

    // 🚚 Bygg rates
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
      {
        service_name: "📦 Blixt Ombud/Paketskåp",
        service_code: "blixt_ombud",
        total_price: String(ombud),
        currency: "SEK",
        description: "Leverans till närmaste paketskåp",
        min_delivery_date: now.toISOString(),
        max_delivery_date: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      },
    ];

    console.log(`📬 Shopify callback från ${shopDomain}:`, rates);
    res.status(200).json({ rates });
  } catch (error) {
    console.error("❌ Error in shipping-rates:", error);
    res.status(500).json({ error: "Failed to calculate rates" });
  }
});

export default router;
