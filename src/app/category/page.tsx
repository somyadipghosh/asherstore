"use client";

import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  {
    label: "All Versions",
    description: "Browse every jersey in our collection — all types, all clubs, all eras.",
    href: "/products?version=all",
    badge: "Full Collection",
    color: "from-white/10 to-white/5",
    accent: "text-white",
    border: "border-white/15",
    highlight: false,
  },
  {
    label: "Clearance",
    description: "End-of-season deals and discounted stock — great kits at unbeatable prices.",
    href: "/products?version=clearance",
    badge: "🔥 Sale",
    color: "from-orange-500/20 to-orange-600/10",
    accent: "text-orange-300",
    border: "border-orange-500/40",
    highlight: true,
  },
  {
    label: "Sublimation Version",
    description: "Vivid all-over printed jerseys with rich colours and sharp graphic detail.",
    href: "/products?version=sublimation",
    badge: "Sublimation",
    color: "from-sky-500/15 to-sky-500/5",
    accent: "text-sky-300",
    border: "border-sky-500/20",
    highlight: false,
  },
  {
    label: "Master Version",
    description: "Top-grade fabric and finish — the master cut for serious fans.",
    href: "/products?version=master",
    badge: "Master",
    color: "from-amber-500/15 to-amber-500/5",
    accent: "text-amber-300",
    border: "border-amber-500/20",
    highlight: false,
  },
  {
    label: "Fan Version",
    description: "Lightweight replica jerseys perfect for matchday and everyday wear.",
    href: "/products?version=fan",
    badge: "Fan",
    color: "from-emerald-500/15 to-emerald-500/5",
    accent: "text-emerald-300",
    border: "border-emerald-500/20",
    highlight: false,
  },
  {
    label: "Player Version",
    description: "Performance-grade jerseys built to the same spec as the pros wear.",
    href: "/products?version=player",
    badge: "Player",
    color: "from-violet-500/15 to-violet-500/5",
    accent: "text-violet-300",
    border: "border-violet-500/20",
    highlight: false,
  },
  {
    label: "Special Edition Version",
    description: "Limited drops, exclusive colourways, and commemorative kits.",
    href: "/products?version=special-edition",
    badge: "Special Edition",
    color: "from-rose-500/15 to-rose-500/5",
    accent: "text-rose-300",
    border: "border-rose-500/20",
    highlight: false,
  },
  {
    label: "Kids Kit",
    description: "Junior-sized kits for young fans — same club colours, perfect fit for little supporters.",
    href: "/products?version=kids-kit",
    badge: "Kids Kit",
    color: "from-pink-500/15 to-pink-500/5",
    accent: "text-pink-300",
    border: "border-pink-500/20",
    highlight: false,
  },
];

export default function CategoryPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-10 text-center">
        <p className="inline-flex rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-rose-300">
          Shop by Type
        </p>
        <h1 className="mt-4 text-5xl leading-tight text-zinc-100 md:text-6xl">
          Categories
        </h1>
        <p className="mt-3 text-base text-zinc-400">
          Pick your version — every style, every grade, in one place.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-linear-to-br p-6 ${cat.border} ${cat.color} ${cat.highlight ? "ring-1 ring-orange-500/40 shadow-lg shadow-orange-900/20" : ""}`}
          >
            {cat.highlight && (
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-orange-300 border border-orange-500/30">
                <Tag size={9} />
                Best Deals
              </div>
            )}
            <div className="space-y-3">
              <span
                className={`inline-block rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-widest ${cat.accent} border-current`}
              >
                {cat.badge}
              </span>
              <h2 className="text-2xl font-bold text-zinc-100">{cat.label}</h2>
              <p className="text-sm leading-relaxed text-zinc-400">{cat.description}</p>
            </div>
            <Link
              href={cat.href}
              className={`mt-6 inline-flex items-center gap-2 self-start rounded-xl border px-5 py-2.5 text-sm font-semibold text-zinc-100 transition ${cat.highlight ? "border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-500/60" : "border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40"}`}
            >
              View Products <ArrowRight size={15} />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
