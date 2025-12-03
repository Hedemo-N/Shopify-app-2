// pages/pending-approval.tsx
import { useRouter } from "next/router";
import { useState } from "react";
import { Page, Text, Button, BlockStack, Card } from "@shopify/polaris";
import dynamic from "next/dynamic";
import type { GetServerSideProps } from "next";

function PendingApprovalPage() {
  const router = useRouter();
  const { shop, host } = router.query;
  const [checking, setChecking] = useState(false);

  const handleCheckAgain = async () => {
    setChecking(true);
    // Redirecta tillbaka till index som kommer kolla Supabase igen
    setTimeout(() => {
      router.push(`/?shop=${shop}&host=${host}`);
    }, 500);
  };

  return (
    <Page>
      <div style={{ maxWidth: 600, margin: "40px auto" }}>
        <Card>
          <BlockStack gap="400">
            <Text variant="headingLg" as="h2">
              🎉 Tack för din registrering!
            </Text>

            <Text as="p">
              Vi har mottagit dina uppgifter och kommer att aktivera ditt konto
              inom kort.
            </Text>

            <Text as="p">
              <strong>Vad händer nu?</strong>
            </Text>

            <ul style={{ marginLeft: 20 }}>
              <li>Vi granskar dina uppgifter</li>
              <li>Aktiverar ditt konto i vårt system</li>
              <li>Skickar bekräftelse via email</li>
            </ul>

            <Text as="p" tone="subdued">
              När ditt konto är aktiverat kan du komma åt alla funktioner genom
              att klicka på knappen nedan eller ladda om appen.
            </Text>

            <Button
              variant="primary"
              onClick={handleCheckAgain}
              loading={checking}
            >
              {checking ? "Kontrollerar..." : "Kolla om mitt konto är aktiverat"}
            </Button>

            <Text as="p" tone="subdued">
              Frågor? Kontakta oss på niklas.hedemo@blixtdelivery.se
            </Text>
          </BlockStack>
        </Card>
      </div>
    </Page>
  );
}

// Skydda pending-approval från att behöva shop/host
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const shop = typeof query.shop === "string" ? query.shop : null;
  const host = typeof query.host === "string" ? query.host : null;

  // Om shop eller host saknas, redirecta till auth
  if (!shop || !host) {
    return {
      redirect: {
        destination: `/api/auth`,
        permanent: false,
      },
    };
  }

  // Pending approval behöver inte kolla profil - alla får komma hit
  return {
    props: {},
  };
};

export default dynamic(() => Promise.resolve(PendingApprovalPage), {
  ssr: false,
});