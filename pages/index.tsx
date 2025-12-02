// pages/index.tsx
import {
  Page,
  Text,
  TextField,
  Checkbox,
  Divider,
  Button,
  BlockStack,
} from "@shopify/polaris";
import { useState, useCallback, useEffect } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import { supabase } from "frontend/lib/supabaseClient"; // eller rätt sökväg


export default function SettingsPage({ shop }: { shop: string }) {

  const router = useRouter();
  const app = useAppBridge();


  const [loading, setLoading] = useState(true);

  // ➤ Ny form med separata öppettider-fält
  const [form, setForm] = useState({
    erbjuda_ombud: false,
    erbjuda_hemleverans_express: false,
    erbjuda_hemleverans_kvall: false,

    pris_ombud: "",
    number_box: "",
    cutoff_time_ombud: "",

    pris_hem2h: "",
    pris_hemkvall: "",
    cutoff_time_evening: "",

    Butiksemail: "",
    Butikstelefon: "",
    Butiksadress: "",

    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  });

  // --- Load settings ---
  useEffect(() => {
    if (!router.isReady || !app) return;

    const load = async () => {
      const token = await getSessionToken(app);

      const res = await fetch(`/api/get-settings?shop=${shop}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success && data.settings) {
        const s = data.settings;

        // ➤ Konvertera opening_hours { monday: [{open,close}], ... }
        const opening = s.opening_hours || {};

        const parsedOpening = {
          monday: opening.monday?.[0]
            ? `${opening.monday[0].open} - ${opening.monday[0].close}`
            : "",
          tuesday: opening.tuesday?.[0]
            ? `${opening.tuesday[0].open} - ${opening.tuesday[0].close}`
            : "",
          wednesday: opening.wednesday?.[0]
            ? `${opening.wednesday[0].open} - ${opening.wednesday[0].close}`
            : "",
          thursday: opening.thursday?.[0]
            ? `${opening.thursday[0].open} - ${opening.thursday[0].close}`
            : "",
          friday: opening.friday?.[0]
            ? `${opening.friday[0].open} - ${opening.friday[0].close}`
            : "",
          saturday: opening.saturday?.[0]
            ? `${opening.saturday[0].open} - ${opening.saturday[0].close}`
            : "",
          sunday: opening.sunday?.[0]
            ? `${opening.sunday[0].open} - ${opening.sunday[0].close}`
            : "",
        };

        setForm((prev) => ({
          ...prev,
          ...s,
          ...parsedOpening,
        }));
      }

      setLoading(false);
    };

    load();
  }, [router.isReady, app]);

  const handleChange = (field: string) => (value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // --- Save settings ---
  const handleSave = useCallback(async () => {
    const token = await getSessionToken(app);

    const res = await fetch("/api/update-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shop, ...form }),
    });

    if (res.ok) {
      alert("Inställningarna sparades! ⚡");
    } else {
      alert("Något gick fel. Försök igen.");
    }
  }, [form]);

  if (loading) return <p style={{ padding: 30 }}>Laddar inställningar...</p>;

  return (
    <Page title="Blixt Delivery – Inställningar">
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "white",
          padding: 20,
          border: "1px solid #e1e3e5",
          borderRadius: 10,
        }}
      >
        <BlockStack gap="400">

          {/* CHECKBOX GROUP */}
          <BlockStack gap="200">
            <Checkbox
              label="Ombud / Paketskåp"
              checked={form.erbjuda_ombud}
              onChange={handleChange("erbjuda_ombud")}
            />
            <Checkbox
              label="Hemleverans Express 2h"
              checked={form.erbjuda_hemleverans_express}
              onChange={handleChange("erbjuda_hemleverans_express")}
            />
            <Checkbox
              label="Hemleverans Kväll 17–22"
              checked={form.erbjuda_hemleverans_kvall}
              onChange={handleChange("erbjuda_hemleverans_kvall")}
            />
          </BlockStack>

          <Divider />

          {/* OMBUD */}
          <Text variant="headingLg" as="h2">Ombud / Paketbox</Text>
          <TextField label="Pris" autoComplete="off" value={form.pris_ombud} onChange={handleChange("pris_ombud")} />
          <TextField label="Antal ombud" autoComplete="off" value={form.number_box} onChange={handleChange("number_box")} />
          <TextField label="Cutoff-tid" autoComplete="off" value={form.cutoff_time_ombud} onChange={handleChange("cutoff_time_ombud")} />

          <Divider />

          {/* EXPRESS */}
          <Text variant="headingLg" as="h2">Hemleverans Express 2h</Text>
          <TextField label="Pris" autoComplete="off" value={form.pris_hem2h} onChange={handleChange("pris_hem2h")} />

          <Divider />

          {/* EVENING */}
          <Text variant="headingLg" as="h2">Hemleverans Kväll 17–22</Text>
          <TextField label="Pris" autoComplete="off" value={form.pris_hemkvall} onChange={handleChange("pris_hemkvall")} />
          <TextField label="Cutoff-tid" autoComplete="off" value={form.cutoff_time_evening} onChange={handleChange("cutoff_time_evening")} />

          <Divider />

          {/* STORE INFO */}
          <Text variant="headingLg" as="h2">Butiksinformation</Text>
          <TextField label="E-post" autoComplete="off" value={form.Butiksemail} onChange={handleChange("Butiksemail")} />
          <TextField label="Telefonnummer" autoComplete="off" value={form.Butikstelefon} onChange={handleChange("Butikstelefon")} />

          <Divider />

          {/* OPENING HOURS */}
          <Text variant="headingLg" as="h2">Öppettider</Text>
          <TextField label="Måndag (t.ex. 10:00 - 18:00)" autoComplete="off" value={form.monday} onChange={handleChange("monday")} />
          <TextField label="Tisdag" autoComplete="off" value={form.tuesday} onChange={handleChange("tuesday")} />
          <TextField label="Onsdag" autoComplete="off" value={form.wednesday} onChange={handleChange("wednesday")} />
          <TextField label="Torsdag" autoComplete="off" value={form.thursday} onChange={handleChange("thursday")} />
          <TextField label="Fredag" autoComplete="off" value={form.friday} onChange={handleChange("friday")} />
          <TextField label="Lördag" autoComplete="off" value={form.saturday} onChange={handleChange("saturday")} />
          <TextField label="Söndag" autoComplete="off" value={form.sunday} onChange={handleChange("sunday")} />

          <Divider />

          <TextField
            label="Butiksadress"
            autoComplete="off"
            value={form.Butiksadress}
            onChange={handleChange("Butiksadress")}
          />

          <Button variant="primary" onClick={handleSave}>Spara inställningar</Button>

        </BlockStack>
      </div>
    </Page>
  );
}
// SSR: kontrollera att shoppen finns
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const shop = typeof query.shop === "string" ? query.shop : null;
  const host = typeof query.host === "string" ? query.host : null;

  console.log("🟡 getServerSideProps körs");
  console.log("➡️ query.shop:", shop);
  console.log("➡️ query.host:", host);

  if (!shop || !host) {
    console.warn("❌ Antingen shop eller host saknas");
    return { notFound: true };
  }

  console.log("🔍 Kollar om shop finns i Supabase:", shop.toLowerCase());

  const { data: existingShop, error } = await supabase
    .from("shopify_shops")
    .select("id")
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
