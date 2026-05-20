import { prisma } from "@/lib/prisma";
import type { Review } from "@/lib/types";

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

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

function computeStats(reviews: Review[]): ReviewStats {
  if (!reviews.length) return { reviewCount: 0, averageRating: 0 };
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return { reviewCount: reviews.length, averageRating: roundToTwo(total / reviews.length) };
}

function mapRow(row: {
  userName: string;
  comment: string;
  rating: number;
  createdAt: Date;
}): Review {
  return {
    user: row.userName,
    comment: row.comment,
    rating: row.rating,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listReviewsForProduct(productId: string, limit = 100): Promise<Review[]> {
  const normalized = productId.trim();
  if (!normalized) return [];

  const rows = await prisma.review.findMany({
    where: { productId: normalized },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(mapRow);
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

  // Batch query all reviews for all products at once.
  const rows = await prisma.review.findMany({
    where: { productId: { in: unique } },
    select: { productId: true, rating: true },
  });

  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    const list = grouped.get(row.productId) ?? [];
    list.push(row.rating);
    grouped.set(row.productId, list);
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

  try {
    await prisma.product.update({
      where: { id: normalized },
      data: { rating: stats.averageRating, reviewCount: stats.reviewCount },
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

  await prisma.review.upsert({
    where: { productId_userId: { productId, userId } },
    update: { userName, comment, rating, createdAt: new Date() },
    create: { productId, userId, userName, comment, rating },
  });

  const stats = await syncProductReviewAggregate(productId);
  const reviews = await listReviewsForProduct(productId, 100);

  return { reviews, stats };
}
