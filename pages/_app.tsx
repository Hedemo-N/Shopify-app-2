// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Provider } from "@shopify/app-bridge-react";
import { useRouter } from "next/router";
import { useMemo } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { host } = router.query;

  const appBridgeConfig = useMemo(() => {
    return {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "",
      host: (typeof host === "string" ? host : "") || new URLSearchParams(window.location.search).get("host") || "",
      forceRedirect: true,
    };
  }, [host]);

  // Don't render until we have a host
  if (!appBridgeConfig.host) {
    return <div>Loading...</div>;
  }

  return (
    <Provider config={appBridgeConfig}>
      <Component {...pageProps} />
    </Provider>
  );
}