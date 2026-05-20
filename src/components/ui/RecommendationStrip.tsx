"use client";

import { useEffect, useState } from "react";

import { Product } from "@/lib/types";
import { ProductCard } from "@/components/ui/ProductCard";
import { useShopStore } from "@/store/useShopStore";

export function RecommendationStrip() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const viewedProductIds = useShopStore((state) => state.recentlyViewed);
  const user = useShopStore((state) => state.user);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            viewedProductIds,
            favoriteTeams: user?.favoriteTeams || []
          })
        });
        const json = (await res.json()) as { products?: Product[] };

        if (active) {
          setItems(res.ok ? json.products || [] : []);
        }
      } catch {
        if (active) {
          setItems([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [viewedProductIds, user?.favoriteTeams]);

  if (loading) {
    return (
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-zinc-100">For you</h3>
        <p className="text-sm text-zinc-400">Loading recommendations...</p>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-zinc-100">For you</h3>
        <p className="text-sm text-zinc-400">No items found.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h3 className="text-xl font-semibold text-zinc-100">For you</h3>
      <div className="grid gap-4 md:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
}
