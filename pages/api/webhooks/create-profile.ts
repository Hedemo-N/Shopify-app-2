import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../frontend/lib/supabaseClient";
import { verifySessionToken } from "../verifySessionToken"

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✔ Endast POST tillåtet
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✔ Verifiera session-token
  const session = await verifySessionToken(req, res);

  if (!session.ok || !session.user?.id) {
    return res.status(401).json({ error: "Ingen användare inloggad" });
  }

  const userId = session.user.id;
  const { email, phone, company, contact_name } = req.body;

  try {
    const { error } = await supabase.from("profiles").upsert({
      _id: userId,
      email,
      phone,
      company,
      contact_name,
    });

    if (error) {
      console.error("❌ Error när profil skulle skapas:", error);
      return res.status(500).json({ error: "Kunde inte skapa profil" });
    }

    console.log("✅ Profil sparad för:", userId);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ create-profile error:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
}
