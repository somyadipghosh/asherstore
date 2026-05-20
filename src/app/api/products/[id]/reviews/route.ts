export const runtime = "nodejs";

import { z } from "zod";

import { appwriteErrorResponse, getCurrentUser } from "@/lib/appwrite-server";
import {
  createOrUpdateReview,
  getReviewStatsForProduct,
  listReviewsForProduct,
} from "@/lib/appwrite-reviews";

const createReviewSchema = z.object({
  comment: z.string().trim().min(3).max(2000),
  rating: z.coerce.number().min(1).max(5),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const [reviews, stats] = await Promise.all([
      listReviewsForProduct(id, 100),
      getReviewStatsForProduct(id),
    ]);

    return Response.json({
      reviews,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
    });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load reviews");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Please log in to submit a review" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".") || "payload";
      return `${path}: ${issue.message}`;
    });

    return Response.json({ error: "Invalid review payload", issues }, { status: 400 });
  }

  try {
    const result = await createOrUpdateReview({
      productId: id,
      userId: user.id,
      userName: user.name,
      comment: parsed.data.comment,
      rating: parsed.data.rating,
    });

    return Response.json({
      reviews: result.reviews,
      averageRating: result.stats.averageRating,
      reviewCount: result.stats.reviewCount,
    });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to submit review");
  }
}
