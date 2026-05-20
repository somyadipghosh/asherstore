import Link from "next/link";
import { ArrowRight } from "lucide-react";

const supportLinks = [
  { label: "Create a Return / Exchange", href: "/returns-exchange" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Shipping & Cancellation Policy", href: "/shipping-cancellation-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Contact Us", href: "/contact-us" }
];

const shopLinks = [
  { label: "Home", href: "/" },
  { label: "All Products", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Matchday Deals", href: "/matchday-deals" }
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/90 text-zinc-200">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-[0.08em] text-white md:text-xl">Support</h3>
            <nav aria-label="Support links">
              <ul className="space-y-3 text-base text-zinc-300">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-[0.08em] text-white md:text-xl">Shop</h3>
            <nav aria-label="Shop links">
              <ul className="space-y-3 text-base text-zinc-300">
                {shopLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="space-y-4">
            <Link
              href="/about-us"
              className="inline-block text-lg font-bold uppercase tracking-[0.08em] text-white transition hover:text-rose-300 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 md:text-xl"
            >
              ABOUT US
            </Link>
            <p className="max-w-md text-base leading-relaxed text-zinc-200">
              We are football fans building THE ASHER STORE, the jersey shop we always wanted to buy from. No clutter,
              no fake hype. Just club colors that feel right on and off matchday.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-lg font-bold tracking-[0.04em] text-white md:text-xl">
              Sign up for new stories and personal offers
            </p>
            <div className="flex items-center rounded-lg border border-white/15 bg-zinc-900/80 px-3">
              <input
                placeholder="E-mail"
                className="w-full bg-transparent py-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
              />
              <button
                aria-label="Submit email"
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-200 hover:bg-white/20"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
          <div className="flex items-center gap-4">
            <Link
              href="https://www.instagram.com/theasher.store?igsh=NHRmN2MwZmhhaXRo"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="inline-flex items-center gap-2 text-zinc-300 transition hover:text-white"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
              <span className="text-sm">Instagram</span>
            </Link>
          </div>
        </div>

        <div className="mt-8 space-y-2 text-sm text-zinc-400">
          <p>© 2026, THE ASHER STORE. Built for fans.</p>
          <p className="flex flex-wrap gap-3">
            <Link
              href="/refund-policy"
              className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Refund policy
            </Link>
            <span>•</span>
            <Link
              href="/privacy-policy"
              className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Privacy policy
            </Link>
            <span>•</span>
            <Link
              href="/terms-and-conditions"
              className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Terms of service
            </Link>
            <span>•</span>
            <Link
              href="/shipping-cancellation-policy"
              className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Shipping policy
            </Link>
            <span>•</span>
            <Link
              href="/contact-us"
              className="hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Contact information
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
