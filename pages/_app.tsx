// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Provider } from "@shopify/app-bridge-react";
import { useRouter } from "next/router";
import { useMemo, useEffect, useState } from "react";

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
    <Provider config={appBridgeConfig}>
      <Component {...pageProps} />
    </Provider>
  );
}