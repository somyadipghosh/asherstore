import { ID, Query, type Models } from "node-appwrite";

import { products as demoProducts } from "@/lib/data";
import type { JerseySize, JerseyVersion, Product, Review } from "@/lib/types";
import { getReviewStatsForProduct, getReviewStatsForProducts, listReviewsForProduct } from "@/lib/appwrite-reviews";
import { appwriteConfig, createAdminClient } from "@/lib/appwrite-server";

const PRODUCT_CACHE_TTL_MS = 30_000;
const productQueryCache = new Map<string, { data: Product[]; expiresAt: number }>();

function withTimeout<T>(promise: Promise<T>, ms = 8000, label = "Appwrite"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

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
  productQueryCache.set(key, {
    data,
    expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS,
  });
}

function clearProductCache() {
  productQueryCache.clear();
}

type ProductRow = {
  id?: unknown;
  name?: unknown;
  team?: unknown;
  price?: unknown;
  images?: unknown;
  version?: unknown;
  sizes?: unknown;
  description?: unknown;
  rating?: unknown;
  reviewCount?: unknown;
  tags?: unknown;
  isMatchPick?: unknown;
  isBestSeller?: unknown;
  reviews?: unknown;
};

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

function listDemoProducts(limit = 200): Product[] {
  return demoProducts.slice(0, limit);
}

function getDemoProductById(productId: string): Product | null {
  return demoProducts.find((item) => item.id === productId) || null;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }

  return [];
}

function toReviews(value: unknown): Review[] {
  const parseList = (raw: unknown): Review[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        if (typeof item !== "object" || item === null) return null;
        const review = item as Record<string, unknown>;
        const user = typeof review.user === "string" ? review.user : "";
        const comment = typeof review.comment === "string" ? review.comment : "";
        const rating = typeof review.rating === "number" ? review.rating : 0;
        const createdAt =
          typeof review.createdAt === "string"
            ? review.createdAt
            : new Date().toISOString();

        if (!user || !comment || !rating) return null;
        return { user, comment, rating, createdAt };
      })
      .filter((item): item is Review => Boolean(item));
  };

  if (Array.isArray(value)) return parseList(value);

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseList(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function toVersions(value: unknown): JerseyVersion[] {
  const parseOne = (v: string): JerseyVersion => {
    const normalized = v.trim().toLowerCase();
    if (normalized === "player") return "player";
    if (normalized === "fan") return "fan";
    if (normalized === "master") return "master";
    if (normalized === "sublimation") return "sublimation";
    if (normalized === "special-edition" || normalized === "special edition" || normalized === "special edition version") {
      return "special-edition";
    }
    if (normalized === "clearance" || normalized === "clearance stock") return "clearance";
    if (normalized === "kids-kit" || normalized === "kids kit") return "kids-kit";
    return "fan";
  };

  if (Array.isArray(value)) {
    const versions = value
      .filter((item): item is string => typeof item === "string")
      .map(parseOne);
    return versions.length ? versions : ["fan"];
  }

  if (typeof value === "string" && value.trim()) {
    return [parseOne(value)];
  }

  return ["fan"];
}

function toSizes(value: unknown): JerseySize[] {
  const valid: JerseySize[] = ["S", "M", "L", "XL", "XXL", "XXXL"];
  const source = toStringArray(value);
  const sizes = source.filter((item): item is JerseySize => valid.includes(item as JerseySize));
  return sizes.length ? sizes : ["M"];
}

function toProduct(doc: Models.Document): Product {
  const row = doc as unknown as ProductRow;
  const reviews = toReviews(row.reviews);

  return {
    id: typeof row.id === "string" ? row.id : doc.$id,
    name: typeof row.name === "string" ? row.name : "Unnamed Product",
    team: typeof row.team === "string" ? row.team : "",
    price: typeof row.price === "number" ? row.price : 0,
    images: toStringArray(row.images),
    version: toVersions(row.version),
    sizes: toSizes(row.sizes),
    description: typeof row.description === "string" ? row.description : "",
    rating: typeof row.rating === "number" ? row.rating : 0,
    reviewCount: typeof row.reviewCount === "number" ? row.reviewCount : reviews.length,
    tags: toStringArray(row.tags),
    isMatchPick: row.isMatchPick === undefined ? true : Boolean(row.isMatchPick),
    isBestSeller: row.isBestSeller === undefined ? false : Boolean(row.isBestSeller),
    reviews,
  };
}

async function withGenuineReviewStats(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;

  try {
    const statsMap = await getReviewStatsForProducts(products.map((item) => item.id));

    return products.map((product) => {
      const stats = statsMap.get(product.id);
      if (!stats) return product;

      return {
        ...product,
        rating: stats.averageRating,
        reviewCount: stats.reviewCount,
      };
    });
  } catch {
    return products;
  }
}

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
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.team.toLowerCase().includes(q);
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

function toAppwriteVersion(version: JerseyVersion[]): string[] {
  return version.map((v) => {
    const normalized = String(v).toLowerCase();
    if (normalized === "player") return "player";
    if (normalized === "fan") return "fan";
    if (normalized === "master") return "master";
    if (normalized === "sublimation") return "sublimation";
    if (normalized === "special-edition" || normalized === "special edition" || normalized === "special edition version") {
      return "special-edition";
    }
    if (normalized === "clearance" || normalized === "clearance stock") return "clearance";
    if (normalized === "kids-kit" || normalized === "kids kit") return "kids-kit";
    return "fan";
  });
}

function toAppwriteRating(value: number): number {
  if (!Number.isFinite(value)) return 1;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value;
}

export async function listProducts(limit = 200): Promise<Product[]> {
  if (!appwriteConfig.apiKey) {
    return listDemoProducts(limit);
  }

  const cacheKey = `all:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) {
    return cached;
  }

  const { databases } = createAdminClient();
  const result = await withTimeout(
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(limit)]
    ),
    8000,
    "listProducts"
  );

  const mapped = await withGenuineReviewStats(result.documents.map(toProduct));
  setCachedProducts(cacheKey, mapped);
  return mapped;
}

export async function listBestSellers(limit = 12): Promise<Product[]> {
  if (!appwriteConfig.apiKey) {
    return listDemoProducts(limit).filter((item) => item.isBestSeller).slice(0, limit);
  }

  const cacheKey = `bestSellers:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { databases } = createAdminClient();
    const result = await withTimeout(
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.productsCollectionId,
        [Query.equal("isBestSeller", true), Query.orderDesc("$createdAt"), Query.limit(limit)]
      ),
      8000,
      "listBestSellers"
    );

    const mapped = await withGenuineReviewStats(result.documents.map(toProduct));
    setCachedProducts(cacheKey, mapped);
    return mapped;
  } catch {
    // fallback: fetch all and filter client-side
    const all = await listProducts();
    return all.filter((item) => item.isBestSeller).slice(0, limit);
  }
}

export async function listMatchdayDeals(limit = 12): Promise<Product[]> {
  if (!appwriteConfig.apiKey) {
    return listDemoProducts(limit).filter((item) => item.isMatchPick).slice(0, limit);
  }

  const cacheKey = `matchdayDeals:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { databases } = createAdminClient();
    const result = await withTimeout(
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.productsCollectionId,
        [Query.equal("isMatchPick", true), Query.orderDesc("$createdAt"), Query.limit(limit)]
      ),
      8000,
      "listMatchdayDeals"
    );

    const mapped = await withGenuineReviewStats(result.documents.map(toProduct));
    setCachedProducts(cacheKey, mapped);
    return mapped;
  } catch {
    // fallback: fetch all and filter client-side
    const all = await listProducts();
    return all.filter((item) => item.isMatchPick).slice(0, limit);
  }
}

export async function listProductsByTeam(team: string, limit = 200): Promise<Product[]> {
  if (!team.trim()) {
    return [];
  }

  if (!appwriteConfig.apiKey) {
    return listDemoProducts(limit).filter((item) => item.team === team);
  }

  const normalizedTeam = team.trim().toLowerCase();
  const cacheKey = `team:${normalizedTeam}:${limit}`;
  const cached = getCachedProducts(cacheKey);
  if (cached) {
    return cached;
  }

  const { databases } = createAdminClient();
  const result = await withTimeout(
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      [Query.equal("team", team), Query.orderDesc("$createdAt"), Query.limit(limit)]
    ),
    8000,
    "listProductsByTeam"
  );

  const mapped = await withGenuineReviewStats(result.documents.map(toProduct));
  setCachedProducts(cacheKey, mapped);
  return mapped;
}

export async function getProductById(productId: string): Promise<Product | null> {
  if (!appwriteConfig.apiKey) {
    return getDemoProductById(productId);
  }

  const { databases } = createAdminClient();

  try {
    const doc = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      productId
    );
    const product = toProduct(doc);
    const [stats, reviews] = await Promise.all([
      getReviewStatsForProduct(product.id),
      listReviewsForProduct(product.id, 100),
    ]);

    return {
      ...product,
      rating: stats.averageRating,
      reviewCount: stats.reviewCount,
      reviews,
    };
  } catch {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      [Query.equal("id", productId), Query.limit(1)]
    );

    const doc = result.documents[0];
    if (!doc) return null;

    const product = toProduct(doc);
    const [stats, reviews] = await Promise.all([
      getReviewStatsForProduct(product.id),
      listReviewsForProduct(product.id, 100),
    ]);

    return {
      ...product,
      rating: stats.averageRating,
      reviewCount: stats.reviewCount,
      reviews,
    };
  }
}

async function resolveDocumentIdByProductId(productId: string): Promise<string | null> {
  const { databases } = createAdminClient();

  try {
    await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      productId
    );
    return productId;
  } catch {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      [Query.equal("id", productId), Query.limit(1)]
    );
    return result.documents[0]?.$id || null;
  }
}

function toPayload(input: ProductUpsertInput) {
  return {
    id: input.id,
    name: input.name,
    team: input.team,
    // Appwrite schema still requires league; keep this internal fallback only.
    league: "General",
    price: input.price,
    images: input.images,
    version: toAppwriteVersion(input.version),
    sizes: input.sizes,
    description: input.description,
    rating: toAppwriteRating(input.rating),
    isMatchPick: input.isMatchPick,
    isBestSeller: input.isBestSeller,
  };
}

export async function createProduct(input: ProductUpsertInput): Promise<Product> {
  const { databases } = createAdminClient();
  const doc = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.productsCollectionId,
    ID.unique(),
    toPayload(input)
  );

  clearProductCache();

  return toProduct(doc);
}

export async function updateProduct(
  productId: string,
  patch: Partial<Omit<ProductUpsertInput, "id">>
): Promise<Product | null> {
  const targetDocumentId = await resolveDocumentIdByProductId(productId);
  if (!targetDocumentId) return null;

  const current = await getProductById(productId);
  if (!current) return null;

  const next: ProductUpsertInput = {
    id: current.id,
    name: patch.name ?? current.name,
    team: patch.team ?? current.team,
    price: patch.price ?? current.price,
    images: patch.images ?? current.images,
    version: patch.version ?? current.version,
    sizes: patch.sizes ?? current.sizes,
    description: patch.description ?? current.description,
    rating: patch.rating ?? current.rating,
    tags: patch.tags ?? current.tags,
    isMatchPick: patch.isMatchPick ?? current.isMatchPick,
    isBestSeller: patch.isBestSeller ?? current.isBestSeller,
    reviews: patch.reviews ?? current.reviews,
  };

  const { databases } = createAdminClient();
  const updated = await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.productsCollectionId,
    targetDocumentId,
    toPayload(next)
  );

  clearProductCache();

  return toProduct(updated);
}

export async function deleteProduct(productId: string): Promise<boolean> {
  const targetDocumentId = await resolveDocumentIdByProductId(productId);
  if (!targetDocumentId) return false;

  const { databases } = createAdminClient();
  await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.productsCollectionId,
    targetDocumentId
  );

  clearProductCache();

  return true;
}
