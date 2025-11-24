// pages/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function IndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady) return; // Vänta tills router.query är redo

    const { shop, host } = router.query;

    if (typeof shop !== "string" || typeof host !== "string") {
      router.push("/login");
      return;
    }

    const checkShopStatus = async () => {
      try {
        const res = await fetch("/api/check-shop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop }),
        });

        const data = await res.json();

        if (res.ok) {
          if (!data.user_id) {
            router.push(`/onboarding?shop=${shop}&host=${host}`);
          } else {
            setLoading(false);
          }
        } else {
          console.error("Database error", data);
          router.push("/login");
        }
      } catch (error) {
        console.error("API error:", error);
        router.push("/login");
      }
    };

    checkShopStatus();
  }, [router.isReady, router]);

  if (loading) return <p>Laddar...</p>;

  return (
    <div>
      <h1>Blixt Delivery Admin</h1>
      {/* Adminpanelen UI här, som tidigare */}
    </div>
  );
}
