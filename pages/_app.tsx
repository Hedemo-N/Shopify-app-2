// pages/_app.tsx
import "@shopify/polaris/build/esm/styles.css";
import "../styles/globals.css";

import type { AppProps } from "next/app";
import { Provider as AppBridgeProvider } from "@shopify/app-bridge-react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [appConfig, setAppConfig] = useState<{
    apiKey: string;
    host: string;
  } | null>(null);

  useEffect(() => {
    // Hämta host från query params
    const queryHost = router.query.host as string;
    const urlParams = new URLSearchParams(window.location.search);
    const urlHost = urlParams.get("host");

    const host = queryHost || urlHost;

    console.log("🔍 App mounting with:", { queryHost, urlHost, host });

    // Validera att host är en giltig base64-kodad sträng
    if (host) {
      try {
        // Testa om host är valid base64
        atob(host);
        console.log("✅ Valid host:", host);
        
        setAppConfig({
          apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY!,
          host: host,
        });
      } catch (e) {
        console.error("❌ Invalid host (not base64):", host);
        // Om host är invalid, visa error
        setAppConfig(null);
      }
    } else {
      console.warn("⚠️ No host found");
    }
  }, [router.query.host]);

  if (!appConfig) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Loading app...</h2>
        <p>If this message persists, please reinstall the app from Shopify Admin.</p>
      </div>
    );
  }

  return (
    <AppBridgeProvider config={{ ...appConfig, forceRedirect: true }}>
      <PolarisAppProvider i18n={enTranslations}>
        <Component {...pageProps} />
      </PolarisAppProvider>
    </AppBridgeProvider>
  );
}