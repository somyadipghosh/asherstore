"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import type { JerseySize, Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

export default function CartPage() {
  const router = useRouter();
  const cart = useShopStore((state) => state.cart);
  const updateQuantity = useShopStore((state) => state.updateQuantity);
  const removeFromCart = useShopStore((state) => state.removeFromCart);
  const user = useShopStore((state) => state.user);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  const SHIPPING_CHARGE = 99;
  const PROMO_CODE_DISCOUNT_RATE = 0.1;
  const VALID_PROMO_CODES = ["ASHER10", "JERSEY10", "WELCOME10"];

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const json = (await res.json()) as { products?: Product[] };
        if (active && res.ok) {
          setCatalog(json.products || []);
        }
      } catch {
        if (active) {
          setCatalog([]);
        }
      }
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  const detailed = useMemo(
    () =>
      cart.map((item) => ({
        ...item,
        product: catalog.find((product) => product.id === item.productId)
      })),
    [cart, catalog]
  );

  const subtotal = detailed.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.qty,
    0
  );

  const shippingCharge = detailed.length ? SHIPPING_CHARGE : 0;
  const discountAmount = appliedPromoCode
    ? Math.round((subtotal + shippingCharge) * PROMO_CODE_DISCOUNT_RATE)
    : 0;
  const finalTotal = Math.max(0, subtotal + shippingCharge - discountAmount);

  function handleApplyPromoCode() {
    const normalized = promoCodeInput.trim().toUpperCase();

    if (!normalized) {
      toast.error("Enter a promo code first.");
      return;
    }

    if (!VALID_PROMO_CODES.includes(normalized)) {
      setAppliedPromoCode(null);
      toast.error("Invalid promo code.");
      return;
    }

    setAppliedPromoCode(normalized);
    toast.success("Promo applied. Discount added to shipping-inclusive total.");
  }

  function handleRemovePromoCode() {
    setAppliedPromoCode(null);
    setPromoCodeInput("");
  }

  async function handleOrderNow() {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const pricedItems = detailed
      .map((entry) => {
        if (!entry.product) return null;

        return {
          productId: entry.productId,
          name: entry.product.name,
          size: entry.size,
          qty: entry.qty,
          price: entry.product.price,
          image: resolveProductImageSrc(entry.product.images[0]),
        };
      })
      .filter(
        (item): item is {
          productId: string;
          name: string;
          size: JerseySize;
          qty: number;
          price: number;
          image: string;
        } => Boolean(item)
      );

    if (!pricedItems.length || pricedItems.length !== detailed.length) {
      toast.error("Some cart items are unavailable. Refresh and try again.");
      return;
    }

    setOrderSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pricedItems,
          total: finalTotal,
          currency: "INR",
        }),
      });

      const json = (await res.json()) as { error?: string; order?: { id: string } };

      if (!res.ok || !json.order?.id) {
        throw new Error(json.error || "Could not place order");
      }

      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const lines = [
        "New order request",
        `Order ID: ${json.order.id}`,
        `Customer: ${user.name || user.email}`,
        `Email: ${user.email}`,
        `Subtotal: ${formatINR(subtotal)}`,
        `Shipping: ${formatINR(shippingCharge)}`,
        `Discount: ${formatINR(discountAmount)}`,
        `Total: ${formatINR(finalTotal)}`,
        "Items:",
        ...pricedItems.map((item) => {
          const imageUrl = item.image.startsWith("/") ? `${baseUrl}${item.image}` : item.image;
          return `- ${item.name} (${item.productId}) | Size ${item.size} | Qty ${item.qty} | ${formatINR(item.price * item.qty)}\n  Image: ${imageUrl}`;
        }),
      ];

      const whatsappText = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/917980918650?text=${whatsappText}`, "_blank", "noopener,noreferrer");

      toast.success("Order placed and WhatsApp message prepared.");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to place order";
      toast.error(message);
    } finally {
      setOrderSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-center text-sm text-rose-100">
        Due to some technical issues, our payment gateway (Razorpay) is currently not connected to the website. All purchases will be redirected to our official WhatsApp number, where our staff team will confirm your order and assist you further with the process.
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
        <h1 className="text-3xl text-zinc-100">Your Cart</h1>
        {!detailed.length ? (
          <p className="text-zinc-400">Cart is empty.</p>
        ) : (
          detailed.map((entry) => (
            <article
              key={`${entry.productId}-${entry.size}`}
              className="grid gap-3 rounded-xl border border-white/10 bg-zinc-950/70 p-3 sm:grid-cols-[110px_1fr_auto]"
            >
              <div className="relative h-24 w-full overflow-hidden rounded-lg">
                <Image
                  src={resolveProductImageSrc(entry.product?.images[0])}
                  alt={entry.product?.name || "Jersey"}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-zinc-100">{entry.product?.name}</p>
                <p className="text-sm text-zinc-400">Size {entry.size}</p>
                <p className="text-sm text-zinc-200">{formatINR((entry.product?.price || 0) * entry.qty)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (entry.qty <= 1) {
                      toast("Use Remove to delete an item from your cart.");
                      return;
                    }
                    updateQuantity(entry.productId, entry.size, entry.qty - 1);
                  }}
                  className="rounded border border-white/20 px-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={entry.qty <= 1}
                >
                  -
                </button>
                <span>{entry.qty}</span>
                <button
                  onClick={() => updateQuantity(entry.productId, entry.size, entry.qty + 1)}
                  className="rounded border border-white/20 px-2"
                >
                  +
                </button>
                <button
                  onClick={() => removeFromCart(entry.productId, entry.size)}
                  className="ml-2 text-xs text-rose-300"
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      <aside className="h-fit rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
        <p className="text-sm text-zinc-400">Subtotal</p>
        <p className="mt-1 text-3xl font-semibold text-zinc-100">{formatINR(subtotal)}</p>
        <p className="mt-2 text-sm text-zinc-400">Shipping: {formatINR(shippingCharge)}</p>

        <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Promo Code</p>
          <div className="mt-2 flex gap-2">
            <input
              value={promoCodeInput}
              onChange={(e) => setPromoCodeInput(e.target.value)}
              placeholder="Enter promo code"
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <button
              onClick={handleApplyPromoCode}
              disabled={!detailed.length}
              className="rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {appliedPromoCode ? (
            <div className="mt-2 flex items-center justify-between text-xs text-emerald-300">
              <span>{appliedPromoCode} applied (10% off total incl. shipping)</span>
              <button onClick={handleRemovePromoCode} className="text-zinc-300 hover:text-white">
                Remove
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <p className="flex items-center justify-between text-zinc-300">
            <span>Discount</span>
            <span>-{formatINR(discountAmount)}</span>
          </p>
          <p className="flex items-center justify-between font-semibold text-zinc-100">
            <span>Total</span>
            <span>{formatINR(finalTotal)}</span>
          </p>
        </div>


        <button
          onClick={handleOrderNow}
          disabled={!detailed.length || orderSubmitting}
          className="mt-4 inline-flex w-full justify-center rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          {orderSubmitting ? "Placing Order..." : "Order Now"}
        </button>

        {showLoginPrompt ? (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">
            <p className="font-semibold text-amber-300">Login required to place an order</p>
            <p className="mt-1 text-zinc-400">
              Sign in so we can send you order updates and keep your purchase safe.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/login?next=/checkout"
                className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-xs font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                Login
              </Link>
              <Link
                href="/signup?next=/checkout"
                className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-center text-xs font-semibold text-zinc-200 hover:border-white/40"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : null}
      </aside>
      </div>
    </div>
  );
}
