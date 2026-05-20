import { Query, type Models } from "node-appwrite";

import { appwriteConfig, createAdminClient } from "@/lib/appwrite-server";

export interface OrderItem {
  productId: string;
  size: string;
  qty: number;
  price: number;
}

export interface AppOrder {
  id: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  currency: string;
  paymentStatus: "created" | "paid" | "failed";
  shippingStatus:
    | "processing"
    | "packed"
    | "shipped"
    | "out_for_delivery"
    | "delivered";
  createdAt: string;
}

export type OrderStatusPatch = {
  shippingStatus?: AppOrder["shippingStatus"];
  paymentStatus?: AppOrder["paymentStatus"];
};

function parseItems(value: unknown): OrderItem[] {
  const toItems = (raw: unknown): OrderItem[] => {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => {
        if (typeof item !== "object" || item === null) return null;
        const row = item as Record<string, unknown>;
        const productId = typeof row.productId === "string" ? row.productId : "";
        const size = typeof row.size === "string" ? row.size : "";
        const qty = typeof row.qty === "number" ? row.qty : 0;
        const price = typeof row.price === "number" ? row.price : 0;
        if (!productId || !size || qty <= 0 || price < 0) return null;
        return { productId, size, qty, price };
      })
      .filter((item): item is OrderItem => Boolean(item));
  };

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return toItems(parsed);
    } catch {
      return [];
    }
  }

  return toItems(value);
}

function toOrder(doc: Models.Document): AppOrder {
  const data = doc as unknown as Record<string, unknown>;

  return {
    id: doc.$id,
    userId: typeof data.userId === "string" ? data.userId : "",
    userEmail: typeof data.userEmail === "string" ? data.userEmail : "",
    items: parseItems(data.items),
    total: typeof data.total === "number" ? data.total : 0,
    currency: typeof data.currency === "string" ? data.currency : "INR",
    paymentStatus:
      data.paymentStatus === "paid" || data.paymentStatus === "failed"
        ? data.paymentStatus
        : "created",
    shippingStatus:
      data.shippingStatus === "packed" ||
      data.shippingStatus === "shipped" ||
      data.shippingStatus === "out_for_delivery" ||
      data.shippingStatus === "delivered"
        ? data.shippingStatus
        : "processing",
    createdAt: doc.$createdAt,
  };
}

export async function listOrders(limit = 200): Promise<AppOrder[]> {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.ordersCollectionId,
    [Query.orderDesc("$createdAt"), Query.limit(limit)]
  );

  return result.documents.map(toOrder);
}

export async function listOrdersByUserId(userId: string, limit = 100): Promise<AppOrder[]> {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.ordersCollectionId,
    [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(limit)]
  );

  return result.documents.map(toOrder);
}

export async function updateOrder(
  orderId: string,
  patch: OrderStatusPatch
): Promise<AppOrder | null> {
  const { databases } = createAdminClient();

  try {
    const doc = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.ordersCollectionId,
      orderId,
      patch
    );
    return toOrder(doc);
  } catch {
    return null;
  }
}
