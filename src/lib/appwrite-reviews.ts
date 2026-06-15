import '@/lib/env-loader'
import { Query } from "node-appwrite";
import type { Review } from "@/lib/types";

import { createAdminDatabase } from "@/lib/appwrite-server";

export interface ReviewStats {
  reviewCount: number;
  averageRating: number;
}

export interface CreateOrUpdateReviewInput {
  productId: string;
  userId: string;
  userName: string;
  comment: string;
  rating: number;
}

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const reviewsCollectionId = process.env.APPWRITE_COLLECTION_REVIEWS_ID || "";
const productsCollectionId = process.env.APPWRITE_COLLECTION_PRODUCTS_ID || "";

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

function computeStats(reviews: Review[]): ReviewStats {
  if (!reviews.length) return { reviewCount: 0, averageRating: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { reviewCount: reviews.length, averageRating: roundToTwo(total / reviews.length) };
}

function mapReviewRow(row: Record<string, unknown>): Review {
  const createdAtValue =
    typeof row.$createdAt === "string"
      ? row.$createdAt
      : typeof row.createdAt === "string"
      ? row.createdAt
      : new Date().toISOString();

  return {
    user: typeof row.userName === "string" ? row.userName : "User",
    comment: typeof row.comment === "string" ? row.comment : "",
    rating: typeof row.rating === "number" ? row.rating : 0,
    createdAt: new Date(createdAtValue).toISOString(),
  };
}

async function listReviewDocuments(queries: unknown[] = [], limit = 100) {
  const db = createAdminDatabase();
  const queryParams = [...queries, Query.limit(limit)] as unknown[];
  const response = await db.listDocuments(databaseId, reviewsCollectionId, queryParams as unknown as string[]);
  return Array.isArray(response.documents) ? response.documents : [];
}

export async function listReviewsForProduct(productId: string, limit = 100): Promise<Review[]> {
  const normalized = productId.trim();
  if (!normalized) return [];

  const rows = await listReviewDocuments([
    Query.equal("productId", normalized),
    Query.orderDesc("$createdAt"),
  ], limit);

  return rows.map(mapReviewRow);
}

export async function getReviewStatsForProduct(productId: string): Promise<ReviewStats> {
  const reviews = await listReviewsForProduct(productId, 5000);
  return computeStats(reviews);
}

export async function getReviewStatsForProducts(
  productIds: string[]
): Promise<Map<string, ReviewStats>> {
  const unique = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)));
  const stats = new Map<string, ReviewStats>();
  if (!unique.length) return stats;

  const rows = await listReviewDocuments([Query.limit(5000)], 5000);

  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    const productId = typeof row.productId === "string" ? row.productId : "";
    const rating = typeof row.rating === "number" ? row.rating : NaN;
    if (!productId || !Number.isFinite(rating)) continue;
    const list = grouped.get(productId) ?? [];
    list.push(rating);
    grouped.set(productId, list);
  }

  for (const productId of unique) {
    const ratings = grouped.get(productId) ?? [];
    if (!ratings.length) {
      stats.set(productId, { reviewCount: 0, averageRating: 0 });
    } else {
      const avg = roundToTwo(ratings.reduce((a, b) => a + b, 0) / ratings.length);
      stats.set(productId, { reviewCount: ratings.length, averageRating: avg });
    }
  }

  return stats;
}

export async function syncProductReviewAggregate(productId: string): Promise<ReviewStats> {
  const normalized = productId.trim();
  if (!normalized) return { reviewCount: 0, averageRating: 0 };

  const stats = await getReviewStatsForProduct(normalized);
  const db = createAdminDatabase();

  try {
    await db.updateDocument(databaseId, productsCollectionId, normalized, {
      rating: stats.averageRating,
      reviewCount: stats.reviewCount,
    });
  } catch {
    // Product might not exist — ignore.
  }

  return stats;
}

export async function createOrUpdateReview(
  input: CreateOrUpdateReviewInput
): Promise<{ reviews: Review[]; stats: ReviewStats }> {
  const productId = input.productId.trim();
  const userId = input.userId.trim();
  const userName = input.userName.trim() || "User";
  const comment = input.comment.trim();
  const rating = Number(input.rating);

  if (!productId || !userId || !comment) throw new Error("Invalid review payload");
  if (!Number.isFinite(rating) || rating < 1 || rating > 5)
    throw new Error("Rating must be between 1 and 5");

  const db = createAdminDatabase();
  const existingResponse = await db.listDocuments(databaseId, reviewsCollectionId, [
    Query.equal("productId", productId),
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  const existing = existingResponse.documents[0] as Record<string, unknown> | undefined;

  if (existing && typeof existing.$id === "string") {
    await db.updateDocument(databaseId, reviewsCollectionId, existing.$id, {
      userName,
      comment,
      rating,
    });
  } else {
    await db.createDocument(databaseId, reviewsCollectionId, `review_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, {
      productId,
      userId,
      userName,
      comment,
      rating,
    });
  }

  const stats = await syncProductReviewAggregate(productId);
  const reviews = await listReviewsForProduct(productId, 100);

  return { reviews, stats };
}
