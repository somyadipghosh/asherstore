"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CheckoutFailurePage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-3xl px-4 py-8 md:px-6">
      <div className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
        <h1 className="text-3xl text-rose-200">Checkout Unavailable</h1>
        <p className="mt-2 text-sm text-rose-100/90">
          Online payments are turned off for now. No payment was attempted.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/checkout")}
            className="rounded-lg bg-rose-400 px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            Back to Checkout
          </button>
          <Link
            href="/cart"
            className="rounded-lg border border-rose-300/30 px-4 py-2 text-sm text-rose-100"
          >
            Back to Cart
          </Link>
        </div>
      </div>
    </div>
  );
}
