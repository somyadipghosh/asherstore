import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Matchday Deals | THE ASHER STORE",
  description: "Discover limited-time offers and bundled jersey deals for matchday."
};

const dealHighlights = [
  "Limited-time discounts on selected club jerseys.",
  "Bundle offers across home and away kits.",
  "Priority stock updates for high-demand drops."
];

export default function MatchdayDealsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <section className="rounded-2xl border border-rose-400/20 bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-rose-300">Shop</p>
        <h1 className="mt-3 text-3xl text-zinc-100 md:text-5xl">Matchday Deals</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
          Grab curated offers built around match weekends, derby nights, and seasonal jersey drops.
        </p>

        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-zinc-300 md:text-base">
          {dealHighlights.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Shop current deals
          </Link>
          <Link
            href="/collections"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Browse collections
          </Link>
        </div>
      </section>
    </main>
  );
}
