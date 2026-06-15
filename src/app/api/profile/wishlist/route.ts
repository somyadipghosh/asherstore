import { z } from "zod";

import { getWishlistProductIds, setWishlistProductState } from "@/lib/appwrite-wishlist";
import { appwriteErrorResponse, getCurrentUser } from "@/lib/appwrite-server";

export const runtime = "nodejs";

const patchSchema = z.object({
  productId: z.string().trim().min(1),
  wished: z.boolean(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const productIds = await getWishlistProductIds(user.id);
    return Response.json({ productIds });
  } catch {
    return Response.json({ productIds: [] });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid wishlist payload" }, { status: 400 });
  }

  try {
    const productIds = await setWishlistProductState({
      userId: user.id,
      productId: parsed.data.productId,
      wished: parsed.data.wished,
    });

    return Response.json({ productIds });
  } catch {
    return Response.json({ productIds: [] });
  }
}
