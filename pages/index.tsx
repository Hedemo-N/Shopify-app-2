import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
  Page,
  Layout,
  Card,
  TextField,
  Checkbox,
  Divider,
  Button,
  BlockStack,
  Box,
  InlineGrid,
  Text,
} from "@shopify/polaris";

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
    cutoff_time_ombud: "",
    number_box: "",
    pris_hem2h: "",
    pris_hemkvall: "",
    cutoff_time_evening: "",
    Butiksemail: "",
    Butikstelefon: "",
    opening_hours: "",
    Butiksadress: "",
  });

  const handleChange = (field: string) => (value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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

  const handleSave = useCallback(async () => {
    const token = await getSessionToken(app);

    await fetch("/api/update-settings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shop, ...form }),
    });

    alert("Inställningarna sparades!");
  }, [form]);

  if (loading) return <p style={{ padding: 30 }}>Laddar...</p>;

  return (
    <Page title="Blixt Delivery – Inställningar">
      <Layout>

        {/* LEVERANSALTERNATIV */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Leveransalternativ</Text>

                <Checkbox
                  label="Ombud / Paketskåp"
                  checked={form.erbjuda_ombud}
                  onChange={handleChange("erbjuda_ombud")}
                />
                <Checkbox
                  label="Express 2h"
                  checked={form.erbjuda_hemleverans_express}
                  onChange={handleChange("erbjuda_hemleverans_express")}
                />
                <Checkbox
                  label="Kväll 17–22"
                  checked={form.erbjuda_hemleverans_kvall}
                  onChange={handleChange("erbjuda_hemleverans_kvall")}
                />

                <Divider />
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* OMBUD */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Ombud / Paketskåp</Text>

                <InlineGrid columns={2} gap="400">
                  <TextField
                    label="Pris"
                    autoComplete="off"
                    value={form.pris_ombud}
                    onChange={handleChange("pris_ombud")}
                  />
                  <TextField
                    label="Cutoff tid"
                    autoComplete="off"
                    value={form.cutoff_time_ombud}
                    onChange={handleChange("cutoff_time_ombud")}
                  />
                </InlineGrid>

                <TextField
                  label="Antal ombudsalternativ"
                  autoComplete="off"
                  value={form.number_box}
                  onChange={handleChange("number_box")}
                />
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* EXPRESS */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Hemleverans Express (2h)</Text>

                <TextField
                  label="Pris"
                  autoComplete="off"
                  value={form.pris_hem2h}
                  onChange={handleChange("pris_hem2h")}
                />
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* KVÄLLSLEVERANS */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Hemleverans Kväll</Text>

                <InlineGrid columns={2} gap="400">
                  <TextField
                    label="Pris"
                    autoComplete="off"
                    value={form.pris_hemkvall}
                    onChange={handleChange("pris_hemkvall")}
                  />
                  <TextField
                    label="Cutoff tid"
                    autoComplete="off"
                    value={form.cutoff_time_evening}
                    onChange={handleChange("cutoff_time_evening")}
                  />
                </InlineGrid>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* BUTIKSINFO */}
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Butiksinformation</Text>

                <InlineGrid columns={2} gap="400">
                  <TextField
                    label="E-post"
                    autoComplete="off"
                    value={form.Butiksemail}
                    onChange={handleChange("Butiksemail")}
                  />
                  <TextField
                    label="Telefon"
                    autoComplete="off"
                    value={form.Butikstelefon}
                    onChange={handleChange("Butikstelefon")}
                  />
                </InlineGrid>

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
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* SAVE BUTTON */}
        <Layout.Section>
          <Button variant="primary" fullWidth onClick={handleSave}>
            Spara inställningar
          </Button>
        </Layout.Section>

      </Layout>
    </Page>
  );
}
