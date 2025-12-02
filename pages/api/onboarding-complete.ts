import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../frontend/lib/supabaseClient";
import { verifySessionToken } from "./verifySessionToken";

export const config = {
  api: {
    bodyParser: true, // normal JSON
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✔ endast POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✔ Verifiera Shopify sessiontoken
  const session = await verifySessionToken(req, res);

  if (!session.ok || !session.user?.id) {
    return res.status(401).json({ error: "Invalid or missing session token" });
  }

  const userId = session.user.id;
  const { shop, email, phone, contact_name, company } = req.body;

  if (!shop) {
    return res.status(400).json({ error: "Missing shop" });
  }

  try {
    // 1️⃣ Koppla användaren till butik i profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ user_id: userId })
      .eq("shop", shop);

    if (updateError) throw updateError;

    // 2️⃣ Skapa profil med defaultvärden
    const { error: insertError } = await supabase.from("profiles").insert({
      _id: userId,
      email,
      phone,
      company,
      contact_name,
      pris_ombud: 45,
      pris_hem2h: 99,
      pris_hemkvall: 65,
      number_box: 3,
    });

    if (insertError) throw insertError;

    console.log("✅ Onboarding klar för:", userId);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Onboarding error:", err);
    return res.status(500).json({ error: "Kunde inte slutföra onboarding" });
  }
}
