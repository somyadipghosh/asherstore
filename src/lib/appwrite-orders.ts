import { Query } from "node-appwrite";

import { createAdminDatabase } from "@/lib/appwrite-server";

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
  shippingStatus: "processing" | "packed" | "shipped" | "out_for_delivery" | "delivered";
  createdAt: string;
}

export type OrderStatusPatch = {
  shippingStatus?: AppOrder["shippingStatus"];
  paymentStatus?: AppOrder["paymentStatus"];
};

const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const ordersCollectionId = process.env.APPWRITE_COLLECTION_ORDERS_ID || "";

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
      return toItems(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  return toItems(value);
}

function toOrder(row: Record<string, unknown>): AppOrder {
  const createdAtValue =
    typeof row.$createdAt === "string"
      ? row.$createdAt
      : typeof row.createdAt === "string"
      ? row.createdAt
      : new Date().toISOString();

  const paymentStatus =
    row.paymentStatus === "paid" || row.paymentStatus === "failed"
      ? (row.paymentStatus as string)
      : "created";

  const shippingStatus =
    row.shippingStatus === "packed" ||
    row.shippingStatus === "shipped" ||
    row.shippingStatus === "out_for_delivery" ||
    row.shippingStatus === "delivered"
      ? (row.shippingStatus as string)
      : "processing";

  return {
    id: typeof row.$id === "string" ? row.$id : typeof row.id === "string" ? row.id : "",
    userId: typeof row.userId === "string" ? row.userId : "",
    userEmail: typeof row.userEmail === "string" ? row.userEmail : "",
    items: parseItems(row.items),
    total: typeof row.total === "number" ? row.total : 0,
    currency: typeof row.currency === "string" ? row.currency : "INR",
    paymentStatus: paymentStatus as AppOrder["paymentStatus"],
    shippingStatus: shippingStatus as AppOrder["shippingStatus"],
    createdAt: new Date(createdAtValue).toISOString(),
  };
}

async function listOrderDocuments(queries: unknown[] = [], limit = 200) {
  const db = createAdminDatabase();
  const queryParams = [...queries, Query.limit(limit)] as unknown[];
  const response = await db.listDocuments(databaseId, ordersCollectionId, queryParams as unknown as string[]);
  return Array.isArray(response.documents) ? response.documents : [];
}

export async function listOrders(limit = 200): Promise<AppOrder[]> {
  const rows = await listOrderDocuments([Query.orderDesc("$createdAt")], limit);
  return rows.map(toOrder);
}

export async function listOrdersByUserId(userId: string, limit = 100): Promise<AppOrder[]> {
  const rows = await listOrderDocuments([Query.equal("userId", userId), Query.orderDesc("$createdAt")], limit);
  return rows.map(toOrder);
}

export async function updateOrder(
  orderId: string,
  patch: OrderStatusPatch
): Promise<AppOrder | null> {
  try {
    const db = createAdminDatabase();
    const row = await db.updateDocument(databaseId, ordersCollectionId, orderId, {
      ...(patch.shippingStatus !== undefined && { shippingStatus: patch.shippingStatus }),
      ...(patch.paymentStatus !== undefined && { paymentStatus: patch.paymentStatus }),
    });
    return toOrder(row as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function createOrder(params: {
  userId: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  currency: string;
  paymentStatus: AppOrder["paymentStatus"];
  shippingStatus: AppOrder["shippingStatus"];
}): Promise<AppOrder> {
  const db = createAdminDatabase();
  const row = await db.createDocument(databaseId, ordersCollectionId, `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, {
    userId: params.userId,
    userEmail: params.userEmail,
    items: JSON.stringify(params.items),
    total: params.total,
    currency: params.currency,
    paymentStatus: params.paymentStatus,
    shippingStatus: params.shippingStatus,
  });
  return toOrder(row as Record<string, unknown>);
}
