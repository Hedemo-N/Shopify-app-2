// pages/_app.tsx
import "@shopify/polaris/build/esm/styles.css";
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

  if (!isClient || !appBridgeConfig.host) {
    return <div style={{ padding: 20 }}>Loading app…</div>;
  }

  return (
    <>
      <Head>
        <meta
          name="shopify-api-key"
          content={process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}
        />
        {/* CRITICAL: Use dangerouslySetInnerHTML to force synchronous loading */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.write('<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"><\\/script>');
              document.write('<script src="https://cdn.shopify.com/shopifycloud/polaris.js"><\\/script>');
            `,
          }}
        />
      </Head>

      <AppBridgeProvider config={appBridgeConfig}>
        <PolarisAppProvider i18n={enTranslations}>
          <Component {...pageProps} />
        </PolarisAppProvider>
      </AppBridgeProvider>
    </>
  );
}