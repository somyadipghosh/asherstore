import { ID, Query, type Models } from "node-appwrite";

import { appwriteConfig, createAdminClient } from "@/lib/appwrite-server";

interface WishlistRow {
  productIds?: unknown;
}

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

function toProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids = value.filter((item): item is string => typeof item === "string");
  return normalizeProductIds(ids);
}

function fromWishlistDocument(doc: Models.Document): string[] {
  const row = doc as unknown as WishlistRow;
  return toProductIds(row.productIds);
}

async function getWishlistDocumentByUserId(userId: string): Promise<Models.Document | null> {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.wishlistCollectionId,
    [Query.equal("userId", userId), Query.limit(1)]
  );

  return result.documents[0] || null;
}

function isConflictError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 409
  );
}

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const doc = await getWishlistDocumentByUserId(userId);
  return doc ? fromWishlistDocument(doc) : [];
}

export async function setWishlistProductState(params: {
  userId: string;
  productId: string;
  wished: boolean;
}): Promise<string[]> {
  const userId = params.userId.trim();
  const productId = params.productId.trim();

  if (!userId || !productId) {
    return [];
  }

  const existing = await getWishlistDocumentByUserId(userId);
  const currentProductIds = existing ? fromWishlistDocument(existing) : [];
  const nextProductIds = params.wished
    ? normalizeProductIds([...currentProductIds, productId])
    : currentProductIds.filter((id) => id !== productId);

  const { databases } = createAdminClient();

  if (existing) {
    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.wishlistCollectionId,
      existing.$id,
      { productIds: nextProductIds } as unknown as Partial<Models.Document>
    );

    return fromWishlistDocument(updated);
  }

  if (!params.wished) {
    return [];
  }

  try {
    const created = await databases.createDocument<Models.DefaultDocument>(
      appwriteConfig.databaseId,
      appwriteConfig.wishlistCollectionId,
      ID.unique(),
      {
        userId,
        productIds: nextProductIds,
      }
    );

    return fromWishlistDocument(created);
  } catch (error) {
    if (!isConflictError(error)) {
      throw error;
    }

    const conflicted = await getWishlistDocumentByUserId(userId);

    if (!conflicted) {
      throw error;
    }

    const conflictedProductIds = fromWishlistDocument(conflicted);
    const mergedProductIds = params.wished
      ? normalizeProductIds([...conflictedProductIds, productId])
      : conflictedProductIds.filter((id) => id !== productId);

    const updated = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.wishlistCollectionId,
      conflicted.$id,
      { productIds: mergedProductIds } as unknown as Partial<Models.Document>
    );

    return fromWishlistDocument(updated);
  }
}
