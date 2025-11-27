// pages/settings.tsx
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

export default function SettingsPage() {
  const router = useRouter();
  const app = useAppBridge();
  const { shop } = router.query;

  const [loading, setLoading] = useState(true);

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
    opening_hours: "",
    Butiksadress: "",
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
        setForm((prev) => ({ ...prev, ...data.settings }));
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

  if (loading)
    return <p style={{ padding: 30 }}>Laddar inställningar...</p>;

  return (
    <Page title="Blixt Delivery – Inställningar">
      {/* ✨ Clean, centered container */}
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
          <Text variant="headingLg" as="h2">
            Ombud / Paketbox
          </Text>

          <TextField
            label="Pris (SEK)"
            autoComplete="off"
            value={form.pris_ombud}
            onChange={handleChange("pris_ombud")}
          />
          <TextField
            label="Antal ombudsalternativ som ska visas"
            autoComplete="off"
            value={form.number_box}
            onChange={handleChange("number_box")}
          />
          <TextField
            label="Cutoff-tid"
            autoComplete="off"
            value={form.cutoff_time_ombud}
            onChange={handleChange("cutoff_time_ombud")}
          />

          <Text as="p" variant="bodySm" tone="subdued">
            Ändring av cutoff-tid kräver manuell justering – kontakta oss.
          </Text>

          <Divider />

          {/* EXPRESS */}
          <Text variant="headingLg" as="h2">
            Hemleverans Express 2h
          </Text>

          <TextField
            label="Pris (SEK)"
            autoComplete="off"
            value={form.pris_hem2h}
            onChange={handleChange("pris_hem2h")}
          />

          <Divider />

          {/* EVENING */}
          <Text variant="headingLg" as="h2">
            Hemleverans Kväll (17–22)
          </Text>

          <TextField
            label="Pris (SEK)"
            autoComplete="off"
            value={form.pris_hemkvall}
            onChange={handleChange("pris_hemkvall")}
          />
          <TextField
            label="Cutoff-tid"
            autoComplete="off"
            value={form.cutoff_time_evening}
            onChange={handleChange("cutoff_time_evening")}
          />

          <Divider />

          {/* STORE INFO */}
          <Text variant="headingLg" as="h2">
            Butiksinformation
          </Text>

          <TextField
            label="E-post för fraktetiketter"
            autoComplete="off"
            value={form.Butiksemail}
            onChange={handleChange("Butiksemail")}
          />
          <TextField
            label="Telefonnummer"
            autoComplete="off"
            value={form.Butikstelefon}
            onChange={handleChange("Butikstelefon")}
          />

          <TextField
            label="Öppettider"
            multiline={4}
            autoComplete="off"
            value={form.opening_hours}
            onChange={handleChange("opening_hours")}
          />

          <TextField
            label="Butiksadress"
            autoComplete="off"
            value={form.Butiksadress}
            onChange={handleChange("Butiksadress")}
          />

          <Divider />

          <Button variant="primary" onClick={handleSave}>
            Spara inställningar
          </Button>
        </BlockStack>
      </div>
    </Page>
  );
}
