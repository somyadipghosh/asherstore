"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type { Product } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

export default function CheckoutPage() {
  const cart = useShopStore((state) => state.cart);

  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;

    async function loadPrices() {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const json = (await res.json()) as { products?: Product[] };

        if (!active || !res.ok) return;

        const nextMap = (json.products || []).reduce<Record<string, number>>((acc, item) => {
          acc[item.id] = item.price;
          return acc;
        }, {});

        setPriceMap(nextMap);
      } catch {
        if (active) {
          setPriceMap({});
        }
      }
    }

    void loadPrices();

    return () => {
      active = false;
    };
  }, []);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (priceMap[item.productId] || 0) * item.qty, 0),
    [cart, priceMap]
  );

  const missingPrices = cart.some((item) => typeof priceMap[item.productId] !== "number");

  useEffect(() => {
    if (missingPrices && cart.length) {
      toast.error("Some product prices are unavailable. Refresh and try again.");
    }
  }, [cart.length, missingPrices]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
        <h1 className="text-4xl text-zinc-100">Checkout</h1>
        <p className="mt-2 text-sm text-zinc-400">Online payments are temporarily unavailable.</p>

        <div className="mt-5 space-y-3 text-sm">
          <input placeholder="Full name" className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2" />
          <input placeholder="Address" className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2" />
          <input placeholder="Pincode" className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2" />
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
          <p className="text-sm text-zinc-400">Payable amount</p>
          <p className="text-3xl font-semibold text-zinc-100">{formatINR(total)}</p>
        </div>

        <button
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-lg bg-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 opacity-90"
        >
          Payments Temporarily Disabled
        </button>
        <Link
          href="/cart"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/5"
        >
          Back To Cart
        </Link>
      </div>
    </div>
  );
}
