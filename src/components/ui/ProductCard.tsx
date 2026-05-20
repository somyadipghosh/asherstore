"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Star, Zap } from "lucide-react";
import toast from "react-hot-toast";

import { Product } from "@/lib/types";
import { formatINR, resolveProductImageSrc } from "@/lib/utils";
import { useShopStore } from "@/store/useShopStore";

interface ProductCardProps {
  product: Product;
  imageLoading?: "lazy" | "eager";
}

function formatVersionLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "sublimation") return "Sublimation Version";
  if (normalized === "master") return "Master Version";
  if (normalized === "player") return "Player Version";
  if (normalized === "special-edition" || normalized === "special edition" || normalized === "special edition version") {
    return "Special Edition Version";
  }
  if (normalized === "clearance" || normalized === "clearance stock") return "Clearance Stock";
  if (normalized === "kids-kit" || normalized === "kids kit") return "Kids Kit";
  return "Fan Version";
}

export function ProductCard({ product, imageLoading = "lazy" }: ProductCardProps) {
  const [ordering, setOrdering] = useState(false);
  const addToCart = useShopStore((state) => state.addToCart);
  const user = useShopStore((state) => state.user);
  const wishlist = useShopStore((state) => state.wishlist);
  const setWishlist = useShopStore((state) => state.setWishlist);

  const wished = wishlist.includes(product.id);

  const shortName = product.name.replace(" Jersey", "");

  async function handleOrderNow() {
    if (!user) {
      toast.error("Please log in to place an order");
      return;
    }

    setOrdering(true);
    try {
      const image = resolveProductImageSrc(product.images[0]);
      const imageUrl = image.startsWith("/") ? `${window.location.origin}${image}` : image;
      const item = {
        productId: product.id,
        name: product.name,
        size: "M",
        qty: 1,
        price: product.price,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [item],
          total: product.price,
          currency: "INR",
        }),
      });

      const json = (await res.json()) as { error?: string; order?: { id: string } };

      if (!res.ok || !json.order?.id) {
        throw new Error(json.error || "Could not place order");
      }

      const lines = [
        "New order request",
        `Order ID: ${json.order.id}`,
        `Customer: ${user.name || user.email}`,
        `Email: ${user.email}`,
        `Total: ${formatINR(product.price)}`,
        "Items:",
        `- ${product.name} (${product.id}) | Size M | Qty 1 | ${formatINR(product.price)}`,
        `  Image: ${imageUrl}`,
      ];

      const whatsappText = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/917980918650?text=${whatsappText}`, "_blank", "noopener,noreferrer");
      toast.success("Order placed! WhatsApp message prepared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setOrdering(false);
    }
  }

  async function handleWishlistToggle() {
    const previousWishlist = wishlist;
    const nextWished = !wished;
    const nextWishlist = nextWished
      ? [...wishlist, product.id]
      : wishlist.filter((id) => id !== product.id);

    setWishlist(nextWishlist);

    if (!user) {
      toast("Sign in to sync wishlist");
      return;
    }

    try {
      const res = await fetch("/api/profile/wishlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, wished: nextWished }),
      });

      const json = (await res.json()) as { productIds?: string[]; error?: string };

      if (!res.ok) {
        throw new Error(json.error || "Failed to update wishlist");
      }

      setWishlist(json.productIds || nextWishlist);
    } catch (error) {
      setWishlist(previousWishlist);
      toast.error(error instanceof Error ? error.message : "Failed to update wishlist");
    }
  }

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/90"
    >
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative h-60 overflow-hidden bg-zinc-900">
          <Image
            src={resolveProductImageSrc(product.images[0])}
            alt={product.name}
            fill
            loading={imageLoading}
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent" />
        </div>
      </Link>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-zinc-400">
          <span>{product.team}</span>
          <span>{product.version.map(formatVersionLabel).join(" · ")}</span>
        </div>
        <Link href={`/products/${product.id}`} className="line-clamp-1 text-2xl leading-tight text-zinc-100">
          {shortName}
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold text-zinc-100">{formatINR(product.price)}</p>
          <p className="flex items-center gap-1 text-sm text-amber-300">
            <Star size={14} className="fill-amber-300" />
            {product.rating.toFixed(1)} ({product.reviewCount ?? 0})
          </p>
        </div>
        <p className="text-xs text-zinc-400">
          Prepaid only
        </p>
        <div className="flex gap-2">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            onClick={() => {
              addToCart({ productId: product.id, size: "M", qty: 1 });
              toast.success("Added to cart");
            }}
          >
            <ShoppingCart size={16} /> Add to Cart
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20 hover:border-cyan-400/60 disabled:opacity-60`}
            disabled={ordering}
            onClick={() => { void handleOrderNow(); }}
          >
            <Zap size={16} /> {ordering ? "Placing..." : "Buy Now"}
          </button>
          <button
            className="rounded-lg border border-white/15 px-3 py-2 text-zinc-200 transition hover:border-rose-400"
            onClick={() => {
              void handleWishlistToggle();
            }}
            aria-label="Toggle wishlist"
          >
            <Heart size={16} className={wished ? "fill-rose-500 text-rose-500" : ""} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
