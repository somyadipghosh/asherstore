import { Product } from "@/lib/types";

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200";

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function cn(...parts: Array<string | boolean | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function getProductById(items: Product[], id: string): Product | undefined {
  return items.find((item) => item.id === id);
}

export function resolveProductImageSrc(image: string | undefined): string {
  if (!image) return DEFAULT_PRODUCT_IMAGE;
  if (/^https?:\/\//i.test(image) || image.startsWith("/")) return image;

  return `/api/images/${encodeURIComponent(image)}`;
}
