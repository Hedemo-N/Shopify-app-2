// pages/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getSessionToken } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function IndexPage() {
  const router = useRouter();
  const app = useAppBridge();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !app) return;

    const { shop, host } = router.query;

    if (typeof shop !== "string" || typeof host !== "string") {
      router.push("/login");
      return;
    }

    const checkShopStatus = async () => {
      try {
        const token = await getSessionToken(app);

        const response = await fetch("/api/check-shop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ shop }),
        });

        const data = await response.json();

        if (response.ok) {
          if (!data.user_id) {
            router.push(`/onboarding?shop=${shop}&host=${host}`);
          } else {
            setLoading(false);
          }
        } else {
          console.warn("Fel från /api/check-shop", data);
          router.push("/login");
        }
      } catch (err) {
        console.error("Fel vid hämtning av session token:", err);
        router.push("/login");
      }
    };

    checkShopStatus();
  }, [router.isReady, router, app]);

  if (loading) return <p>Laddar adminpanelen...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Blixt Delivery Admin</h1>
      <p>Välkommen till din adminpanel! ✨</p>
      {/* Lägg till funktionalitet här */}
    </div>
  );
}
