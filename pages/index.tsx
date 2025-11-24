

// pages/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function IndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkShopStatus = async () => {
      const shop = router.query.shop;
      const host = router.query.host;

      if (!shop || !host) {
        router.push("/login");
        return;
      }

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
          setLoading(false); // show admin UI below
        }
      } else {
        console.error("Database error", data);
        router.push("/login");
      }
    };

    checkShopStatus();
  }, [router]);

  if (loading) return <p>Laddar...</p>;

  return (
    <div>
      <h1>Blixt Delivery Admin</h1>
      {/* Adminpanelen UI här, som tidigare */}
    </div>
  );
}

