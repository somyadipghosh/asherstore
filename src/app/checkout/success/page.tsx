"use client";

import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
        <h1 className="text-3xl text-amber-200">Checkout Disabled</h1>
        <p className="mt-2 text-sm text-amber-100/90">
          Online payment is currently turned off while we update the checkout flow.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/cart"
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            Back to Cart
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-amber-300/30 px-4 py-2 text-sm text-amber-100"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
