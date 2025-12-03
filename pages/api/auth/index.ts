// Behåll HELA din SettingsPage komponent precis som den är
// Ändra BARA getServerSideProps:
import type { GetServerSideProps } from "next";
import { supabase } from "frontend/lib/supabaseClient";
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const shop = typeof query.shop === "string" ? query.shop : null;
  const host = typeof query.host === "string" ? query.host : null;

  console.log("🟡 getServerSideProps körs");
  console.log("➡️ query.shop:", shop);
  console.log("➡️ query.host:", host);

  // Om BÅDA saknas - låt klienten hantera det (första render från Shopify)
  if (!shop && !host) {
    console.warn("⚠️ Initial load utan params - skickar till auth");
    return {
      redirect: {
        destination: `/api/auth`,
        permanent: false,
      },
    };
  }

  // Om bara EN saknas
  if (!shop || !host) {
    console.warn("❌ Antingen shop eller host saknas");
    const params = new URLSearchParams();
    if (shop) params.append("shop", shop);
    if (host) params.append("host", host);
    
    return {
      redirect: {
        destination: `/api/auth?${params.toString()}`,
        permanent: false,
      },
    };
  }

  console.log("🔍 Kollar om shop finns i Supabase:", shop.toLowerCase());

  const { data: existingShop, error } = await supabase
    .from("profiles")
    .select("_id")
    .eq("shop", shop.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("❌ Fel från Supabase:", error);
  }

  if (!existingShop) {
    console.warn("⚠️ Shop finns inte i Supabase. Skickar till onboarding...");
    return {
      redirect: {
        destination: `/onboarding?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`,
        permanent: false,
      },
    };
  }

  console.log("✅ Shop finns i Supabase. Laddar admin...");
  return {
    props: { shop },
  };
};