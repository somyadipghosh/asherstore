import { prisma } from "@/lib/prisma";
import { products as demoProducts } from "@/lib/data";
import type { JerseySize, JerseyVersion, Product, Review } from "@/lib/types";
import {
  getReviewStatsForProduct,
  getReviewStatsForProducts,
  listReviewsForProduct,
} from "@/lib/appwrite-reviews";

const PRODUCT_CACHE_TTL_MS = 30_000;
const productQueryCache = new Map<string, { data: Product[]; expiresAt: number }>();

function getCachedProducts(key: string): Product[] | null {
  const entry = productQueryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    productQueryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedProducts(key: string, data: Product[]) {
  productQueryCache.set(key, { data, expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS });
}

function clearProductCache() {
  productQueryCache.clear();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductFilters {
  team?: string | null;
  version?: string | null;
  q?: string | null;
  min?: number | null;
  max?: number | null;
  bestSeller?: boolean | null;
  matchPick?: boolean | null;
}

export interface ProductUpsertInput {
  id: string;
  name: string;
  team: string;
  price: number;
  images: string[];
  version: JerseyVersion[];
  sizes: JerseySize[];
  description: string;
  rating: number;
  tags: string[];
  isMatchPick: boolean;
  isBestSeller: boolean;
  reviews: Review[];
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

type PrismaProductRow = {
  id: string;
  name: string;
  team: string;
  price: number;
  images: string[];
  version: string[];
  sizes: string[];
  description: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  isMatchPick: boolean;
  isBestSeller: boolean;
  createdAt: Date;
};

function toProduct(row: PrismaProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    team: row.team,
    price: row.price,
    images: row.images,
    version: row.version as JerseyVersion[],
    sizes: row.sizes as JerseySize[],
    description: row.description,
    rating: row.rating,
    reviewCount: row.reviewCount,
    tags: row.tags,
    isMatchPick: row.isMatchPick,
    isBestSeller: row.isBestSeller,
    reviews: [],
  };
}

function toRating(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value;
}

// ---------------------------------------------------------------------------
// Demo product fallback
// ---------------------------------------------------------------------------

function listDemoProducts(limit = 200): Product[] {
  return demoProducts.slice(0, limit);
}

function getDemoProductById(productId: string): Product | null {
  return demoProducts.find((item) => item.id === productId) || null;
}

// ---------------------------------------------------------------------------
// Review stats enrichment
// ---------------------------------------------------------------------------

async function withGenuineReviewStats(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;

  try {
    const statsMap = await getReviewStatsForProducts(products.map((item) => item.id));

    return products.map((product) => {
      const stats = statsMap.get(product.id);
      if (!stats) return product;
      return { ...product, rating: stats.averageRating, reviewCount: stats.reviewCount };
    });
  } catch {
    return products;
  }
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function filterProducts(products: Product[], filters: ProductFilters): Product[] {
  const team = filters.team || null;
  const version = filters.version?.toLowerCase().trim() || null;
  const q = filters.q?.toLowerCase().trim() || "";
  const min = typeof filters.min === "number" ? filters.min : null;
  const max = typeof filters.max === "number" ? filters.max : null;
  const bestSeller = filters.bestSeller ?? null;
  const matchPick = filters.matchPick ?? null;

  return products.filter((item) => {
    const matchesTeam = !team || item.team === team;
    const matchesVersion = !version || item.version.some((v) => v.toLowerCase() === version);
    const matchesMin = min === null || item.price >= min;
    const matchesMax = max === null || item.price <= max;
    const matchesQuery =
      !q || item.name.toLowerCase().includes(q) || item.team.toLowerCase().includes(q);
    const matchesBestSeller = bestSeller === null || item.isBestSeller === bestSeller;
    const matchesMatchPick = matchPick === null || item.isMatchPick === matchPick;

    return (
      matchesTeam &&
      matchesVersion &&
      matchesMin &&
      matchesMax &&
      matchesQuery &&
      matchesBestSeller &&
      matchesMatchPick
    );
  });
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function listProducts(limit = 200): Promise<Product[]> {
  const cacheKey = `all:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const products = await withGenuineReviewStats(rows.map(toProduct));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return listDemoProducts(limit);
  }
}

export async function listBestSellers(limit = 12): Promise<Product[]> {
  const cacheKey = `bestSellers:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await prisma.product.findMany({
      where: { isBestSeller: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const products = await withGenuineReviewStats(rows.map(toProduct));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    const all = await listProducts();
    return all.filter((item) => item.isBestSeller).slice(0, limit);
  }
}

export async function listMatchdayDeals(limit = 12): Promise<Product[]> {
  const cacheKey = `matchdayDeals:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await prisma.product.findMany({
      where: { isMatchPick: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const products = await withGenuineReviewStats(rows.map(toProduct));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    const all = await listProducts();
    return all.filter((item) => item.isMatchPick).slice(0, limit);
  }
}

export async function listProductsByTeam(team: string, limit = 200): Promise<Product[]> {
  if (!team.trim()) return [];

  const cacheKey = `team:${team.trim().toLowerCase()}:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) return cached;

  try {
    const rows = await prisma.product.findMany({
      where: { team },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const products = await withGenuineReviewStats(rows.map(toProduct));
    setCachedProducts(cacheKey, products);
    return products;
  } catch {
    return listDemoProducts(limit).filter((item) => item.team === team);
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const row = await prisma.product.findUnique({ where: { id: productId } });
    if (!row) return getDemoProductById(productId);

    const product = toProduct(row);
    const [stats, reviews] = await Promise.all([
      getReviewStatsForProduct(product.id),
      listReviewsForProduct(product.id, 100),
    ]);

    return { ...product, rating: stats.averageRating, reviewCount: stats.reviewCount, reviews };
  } catch {
    return getDemoProductById(productId);
  }
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export async function createProduct(input: ProductUpsertInput): Promise<Product> {
  const row = await prisma.product.create({
    data: {
      id: input.id,
      name: input.name,
      team: input.team,
      price: input.price,
      images: input.images,
      version: input.version as string[],
      sizes: input.sizes as string[],
      description: input.description,
      rating: toRating(input.rating),
      reviewCount: 0,
      tags: input.tags,
      isMatchPick: input.isMatchPick,
      isBestSeller: input.isBestSeller,
    },
  });

  clearProductCache();
  return toProduct(row);
}

export async function updateProduct(
  productId: string,
  patch: Partial<Omit<ProductUpsertInput, "id">>
): Promise<Product | null> {
  const current = await getProductById(productId);
  if (!current) return null;

  const row = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.team !== undefined && { team: patch.team }),
      ...(patch.price !== undefined && { price: patch.price }),
      ...(patch.images !== undefined && { images: patch.images }),
      ...(patch.version !== undefined && { version: patch.version as string[] }),
      ...(patch.sizes !== undefined && { sizes: patch.sizes as string[] }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.rating !== undefined && { rating: toRating(patch.rating) }),
      ...(patch.tags !== undefined && { tags: patch.tags }),
      ...(patch.isMatchPick !== undefined && { isMatchPick: patch.isMatchPick }),
      ...(patch.isBestSeller !== undefined && { isBestSeller: patch.isBestSeller }),
    },
  });

  clearProductCache();
  return toProduct(row);
}

export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    await prisma.product.delete({ where: { id: productId } });
    clearProductCache();
    return true;
  } catch {
    return false;
  }
}
