import { Query } from "node-appwrite";

import { createAdminDatabase } from "@/lib/appwrite-server";

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const wishlistCollectionId = process.env.APPWRITE_COLLECTION_WISHLISTS_ID || "";

function normalizeProductIds(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const rawId of rawIds) {
    if (typeof rawId !== "string") continue;
    const value = rawId.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
}

function parseProductIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return normalizeProductIds(raw);
  if (typeof raw === "string") {
    try {
      return normalizeProductIds(JSON.parse(raw));
    } catch {
      return raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const db = createAdminDatabase();
  const response = await db.listDocuments(databaseId, wishlistCollectionId, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  const row = response.documents[0] as Record<string, unknown> | undefined;
  return row ? parseProductIds(row.productIds) : [];
}

export async function setWishlistProductState(params: {
  userId: string;
  productId: string;
  wished: boolean;
}): Promise<string[]> {
  const userId = params.userId.trim();
  const productId = params.productId.trim();
  if (!userId || !productId) return [];

  const db = createAdminDatabase();
  const response = await db.listDocuments(databaseId, wishlistCollectionId, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  const existing = response.documents[0] as Record<string, unknown> | undefined;
  const currentIds = existing ? parseProductIds(existing.productIds) : [];
  const nextIds = params.wished
    ? normalizeProductIds([...currentIds, productId])
    : currentIds.filter((id) => id !== productId);

  if (existing && typeof existing.$id === "string") {
    await db.updateDocument(databaseId, wishlistCollectionId, existing.$id, {
      productIds: nextIds,
    });
  } else {
    await db.createDocument(databaseId, wishlistCollectionId, userId, {
      userId,
      productIds: nextIds,
    });
  }

  return nextIds;
}
