import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Collections | THE ASHER STORE",
  description: "Browse jersey collections from top clubs and iconic football eras."
};

const collections = [
  {
    name: "Sublimation Version",
    description: "Lightweight build with breathable prints made for daily wear and game nights."
  },
  {
    name: "Master Version",
    description: "Premium detailing and elevated finishing for collectors who want the best cut."
  },
  {
    name: "Fan Version",
    description: "Balanced comfort and club identity built for supporters on and off the stands."
  },
  {
    name: "Player Version",
    description: "Athletic, match-inspired fit with technical fabric tuned for high intensity."
  },
  {
    name: "Kids Kit",
    description: "Junior-sized club kits for young fans — same club colours, made for little supporters."
  }
];

export default function CollectionsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.25em] text-rose-400">Shop</p>
        <h1 className="mt-3 text-3xl text-zinc-100 md:text-5xl">Collections</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-300 md:text-base">
          Explore focused collections built for football fans who care about color, fit, and matchday identity.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Jersey collections">
        {collections.map((collection) => (
          <article
            key={collection.name}
            className="rounded-xl border border-white/10 bg-zinc-900/70 p-5"
          >
            <h2 className="text-xl text-zinc-100">{collection.name}</h2>
            <p className="mt-2 text-sm text-zinc-300">{collection.description}</p>
            <Link
              href="/products"
              className="mt-4 inline-flex text-sm font-semibold text-rose-300 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              View products
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
