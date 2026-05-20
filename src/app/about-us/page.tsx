import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | ASHER STORE",
  description: "Learn about ASHER STORE and why we built a fan-first jersey shopping experience."
};

export default function AboutUsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-rose-400">Brand</p>
        <h1 className="mt-3 text-3xl text-zinc-100 md:text-5xl">ABOUT US</h1>

        <p className="mt-5 text-sm leading-relaxed text-zinc-300 md:text-base">
          THE ASHER STORE was started by football fans who wanted jersey shopping to feel clean, direct, and reliable.
          We focus on fit, product clarity, and matchday-ready styles.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-xl uppercase text-zinc-100">WHAT WE STAND FOR</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
              <li>Delivering high-quality jerseys.</li>
              <li>Keeping prices affordable for everyone.</li>
              <li>Providing fast and reliable support.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <h2 className="text-xl uppercase text-zinc-100">HOW WE BUILD</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
              <li>Delivering orders quickly and efficiently.</li>
              <li>Providing responsive customer support.</li>
              <li>Building trust through positive customer feedback.</li>
            </ul>
          </section>
        </div>

        <div className="mt-8">
          <Link
            href="/products"
            className="inline-flex rounded-lg border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-300 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Explore products
          </Link>
        </div>
      </article>
    </main>
  );
}
