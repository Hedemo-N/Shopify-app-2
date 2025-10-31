import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

router.post("/api/shipping-rates", async (req, res) => {
  try {
    const payload = req.body;

    // hämta butikens domän (t.ex. hedens-skor.myshopify.com)
    const shopDomain =
      req.headers["x-shopify-shop-domain"] ||
      payload?.rate?.shop ||
      payload?.shop;

    // Hämta butiksdata och priser från Supabase
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

    // fallbackvärden
 const home2h = Math.round((profile?.pris_hem2h ?? 99) * 100);
    const homeEvening = Math.round((profile?.pris_hemkvall ?? 65) * 100);
    const ombud = Math.round((profile?.pris_ombud ?? 45) * 100);


    // Skicka tillbaka rates till Shopify
    const rates = [
      {
        service_name: "🚴‍♂️ Blixt Hem inom 2h",
        service_code: "blixt_home_2h",
        total_price: home2h,
        currency: "SEK",
        description: "Leverans med cykel inom 2 timmar",
      },
      {
        service_name: "🌆 Blixt Kväll (17–21)",
        service_code: "blixt_home_evening",
        total_price: homeEvening,
        currency: "SEK",
        description: "Leverans samma kväll",
      },
      {
        service_name: "📦 Blixt Ombud/Paketskåp",
        service_code: "blixt_ombud",
        total_price: ombud,
        currency: "SEK",
        description: "Leverans till närmaste paketskåp",
      },
    ];

    return res.status(200).json({ rates });
  } catch (error) {
    console.error("❌ Error in shipping-rates:", error);
    return res.status(500).json({ error: "Failed to calculate rates" });
  }
});

export default router;
