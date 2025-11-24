// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Här kan du lägga till global kontext som t.ex. ThemeProvider, SessionProvider etc */}
      <Component {...pageProps} />
    </>
  );
}
