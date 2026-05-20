import { ID, Query, type Models } from "node-appwrite";

import { appwriteConfig, createAdminClient } from "@/lib/appwrite-server";
import type { Review } from "@/lib/types";

interface ReviewRow {
  productId?: unknown;
  userId?: unknown;
  userName?: unknown;
  comment?: unknown;
  rating?: unknown;
  createdAt?: unknown;
}

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

function toReview(doc: Models.Document): Review {
  const row = doc as unknown as ReviewRow;
  const userName = typeof row.userName === "string" ? row.userName : "User";

  return {
    user: userName,
    comment: typeof row.comment === "string" ? row.comment : "",
    rating: typeof row.rating === "number" ? row.rating : 0,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : doc.$createdAt || new Date().toISOString(),
  };
}

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

function computeStats(reviews: Review[]): ReviewStats {
  if (!reviews.length) {
    return { reviewCount: 0, averageRating: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    reviewCount: reviews.length,
    averageRating: roundToTwo(total / reviews.length),
  };
}

async function resolveProductDocumentId(productId: string): Promise<string | null> {
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

export async function listReviewsForProduct(productId: string, limit = 100): Promise<Review[]> {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId) return [];

  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.reviewsCollectionId,
    [
      Query.equal("productId", normalizedProductId),
      Query.orderDesc("createdAt"),
      Query.limit(limit),
    ]
  );

  return result.documents.map(toReview);
}

export async function getReviewStatsForProduct(productId: string): Promise<ReviewStats> {
  const reviews = await listReviewsForProduct(productId, 5000);
  return computeStats(reviews);
}

export async function getReviewStatsForProducts(productIds: string[]): Promise<Map<string, ReviewStats>> {
  const uniqueProductIds = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)));
  const stats = new Map<string, ReviewStats>();

  if (!uniqueProductIds.length) return stats;

  for (const productId of uniqueProductIds) {
    const reviewStats = await getReviewStatsForProduct(productId);
    stats.set(productId, reviewStats);
  }

  return stats;
}

export async function syncProductReviewAggregate(productId: string): Promise<ReviewStats> {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId) {
    return { reviewCount: 0, averageRating: 0 };
  }

  const stats = await getReviewStatsForProduct(normalizedProductId);
  const productDocumentId = await resolveProductDocumentId(normalizedProductId);

  if (!productDocumentId) return stats;

  const { databases } = createAdminClient();
  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.productsCollectionId,
    productDocumentId,
    {
      rating: stats.averageRating,
      reviewCount: stats.reviewCount,
    } as unknown as Partial<Models.Document>
  );

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

  if (!productId || !userId || !comment) {
    throw new Error("Invalid review payload");
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const { databases } = createAdminClient();
  const existing = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.reviewsCollectionId,
    [Query.equal("productId", productId), Query.equal("userId", userId), Query.limit(1)]
  );

  const payload = {
    productId,
    userId,
    userName,
    comment,
    rating,
    createdAt: new Date().toISOString(),
  } as const;

  if (existing.documents[0]) {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.reviewsCollectionId,
      existing.documents[0].$id,
      payload as unknown as Partial<Models.Document>
    );
  } else {
    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.reviewsCollectionId,
      ID.unique(),
      payload
    );
  }

  const stats = await syncProductReviewAggregate(productId);
  const reviews = await listReviewsForProduct(productId, 100);

  return { reviews, stats };
}
