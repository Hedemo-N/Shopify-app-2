// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";

import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // App Bridge must run on client only
  useEffect(() => {
    setIsClient(true);
  }, []);

  const host = useMemo(() => {
    if (!isClient) return "";

    if (router.query.host) {
      return router.query.host as string;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get("host") || "";
  }, [router.query.host, isClient]);

  const appBridgeConfig = useMemo(() => {
    return {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "",
      host,
      forceRedirect: true,
    };
  }, [host]);

  // Don’t render until client-side & host loaded
  if (!isClient || !appBridgeConfig.host) {
    return <div style={{ padding: 20 }}>Loading app…</div>;
  }

  return (
    <>
      <Head>
        {/* REQUIRED for app approval */}
        <meta
          name="shopify-api-key"
          content={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}
        />

        {/* Must NOT have async/defer/type=module */}
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      </Head>

      {/* App Bridge Provider FIRST */}
      <AppBridgeProvider config={appBridgeConfig}>
        {/* Polaris wrapper (REQUIRED: gives i18n) */}
        <PolarisAppProvider i18n={enTranslations}>
          <Component {...pageProps} />
        </PolarisAppProvider>
      </AppBridgeProvider>
    </>
  );
}
