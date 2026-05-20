import { prisma } from "@/lib/prisma";

function normalizeProductIds(rawIds: string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const rawId of rawIds) {
    const value = rawId.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
}

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const row = await prisma.wishlist.findUnique({ where: { userId } });
  return row ? normalizeProductIds(row.productIds) : [];
}

export async function setWishlistProductState(params: {
  userId: string;
  productId: string;
  wished: boolean;
}): Promise<string[]> {
  const userId = params.userId.trim();
  const productId = params.productId.trim();
  if (!userId || !productId) return [];

  const existing = await prisma.wishlist.findUnique({ where: { userId } });
  const currentIds = existing ? normalizeProductIds(existing.productIds) : [];
  const nextIds = params.wished
    ? normalizeProductIds([...currentIds, productId])
    : currentIds.filter((id) => id !== productId);

  const row = await prisma.wishlist.upsert({
    where: { userId },
    update: { productIds: nextIds },
    create: { userId, productIds: nextIds },
  });

  return normalizeProductIds(row.productIds);
}
