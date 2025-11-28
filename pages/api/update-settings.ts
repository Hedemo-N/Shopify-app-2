// pages/api/update-settings.ts

import type { NextApiRequest, NextApiResponse } from "next";
import "@shopify/shopify-api/adapters/node";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import { supabase } from "../../frontend/lib/supabaseClient";

// ---- MAPBOX FETCH ----
async function geocodeAddress(address: string) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${token}`;

  const res = await fetch(url);
  const data = await res.json();

  const feature = data.features?.[0];
  if (!feature) return null;

  return {
    latitude: feature.center[1],
    longitude: feature.center[0],
  };
}

// ---- OPENING HOURS PARSER ----
function parseOpeningHours(input: Record<string, string>) {
  const result: Record<string, { open: string; close: string }[]> = {};

  for (const [day, value] of Object.entries(input)) {
    if (!value) continue;

    const parts = value.split("-");
    if (parts.length !== 2) continue;

    const open = parts[0].trim();
    const close = parts[1].trim();

    result[day] = [{ open, close }];
  }

  return result;
}

// ---- SHOPIFY CLIENT ----
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(","),
  hostName: process.env.SHOPIFY_APP_URL!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: ApiVersion.October25,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // ---- 1. Shopify Session Token ----
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Missing token" });

    const payload = await shopify.session.decodeSessionToken(token);
    const shop = payload.dest.replace("https://", "").toLowerCase();

    // ---- 2. Extract data ----
    const {
      Butiksadress,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      ...rest
    } = req.body;

    // ---- 3. Geo-koda adress ----
    let coords = null;
    if (Butiksadress) {
      coords = await geocodeAddress(Butiksadress);
    }

    // ---- 4. Bygg opening_hours JSON ----
    const opening_hours = parseOpeningHours({
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
    });

    // ---- 5. Sätt ihop data som ska sparas ----
    const updateData: any = {
      ...rest,
      Butiksadress,
      opening_hours,
    };

    if (coords) {
      updateData.store_coords = `${coords.latitude},${coords.longitude}`;
    }

    // ---- 6. Spara i Supabase ----
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("shop", shop);

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ update-settings error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
