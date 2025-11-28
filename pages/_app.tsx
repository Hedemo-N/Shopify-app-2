// pages/_app.tsx
import "@shopify/polaris/build/esm/styles.css";
import "../styles/globals.css";

import type { AppProps } from "next/app";
import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [host, setHost] = useState<string>("");

  useEffect(() => {
    const queryHost =
      (router.query.host as string) ||
      new URLSearchParams(window.location.search).get("host");

    if (queryHost) setHost(queryHost);
  }, [router.query.host]);

  if (!host) {
    return <div style={{ padding: 20 }}>Loading app…</div>;
  }

  return (
    <AppBridgeProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
        host,
        forceRedirect: true,
      }}
    >
      <PolarisAppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </PolarisAppProvider>
    </AppBridgeProvider>
  );
}
