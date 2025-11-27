// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";

import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";

import enTranslations from "@shopify/polaris/locales/en.json";

import { useRouter } from "next/router";
import { useMemo, useEffect, useState } from "react";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Only run on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const host = useMemo(() => {
    if (!isClient) return "";

    // Get from router first
    if (router.query.host) {
      return router.query.host as string;
    }

    // Fallback to URL params
    const params = new URLSearchParams(window.location.search);
    return params.get("host") || "";
  }, [router.query.host, isClient]);

  const appBridgeConfig = useMemo(() => {
    return {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "",
      host: host,
      forceRedirect: true,
    };
  }, [host]);

  // Don't render until client-side and we have a host
  if (!isClient || !appBridgeConfig.host) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        {/* Load App Bridge from Shopify's CDN - REQUIRED for app approval */}
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          async
        />
      </Head>

      {/* 🔥 AppBridge först (oförändrat) */}
      <AppBridgeProvider config={appBridgeConfig}>
        {/* 🔥 Polaris wrapper – ENDA tillägget du behövde */}
        <PolarisAppProvider i18n={enTranslations}>
          <Component {...pageProps} />
        </PolarisAppProvider>
      </AppBridgeProvider>
    </>
  );
}
