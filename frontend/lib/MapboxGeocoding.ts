import dotenv from "dotenv";
dotenv.config();

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
if (!MAPBOX_ACCESS_TOKEN) {
  throw new Error("❌ Mapbox Access Token saknas. Lägg till i .env-filen!");
}

type Coordinates = { latitude: number; longitude: number };

export async function getCoordinatesFromMapbox(
  address: string
): Promise<Coordinates | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${MAPBOX_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.features?.length > 0) {
      const [longitude, latitude] = data.features[0].center;
      console.log("📍 Hämtade koordinater från Mapbox:", { latitude, longitude });
      return { latitude, longitude };
    } else {
      console.error("⚠️ Inga resultat för adress:", address);
      return null;
    }
  } catch (error) {
    console.error("❌ Geocoding misslyckades:", error);
    return null;
  }
}
