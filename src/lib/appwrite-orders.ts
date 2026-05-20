import { prisma } from "@/lib/prisma";

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

type PrismaOrderRow = {
  id: string;
  userId: string;
  userEmail: string;
  items: unknown;
  total: number;
  currency: string;
  paymentStatus: string;
  shippingStatus: string;
  createdAt: Date;
};

function toOrder(row: PrismaOrderRow): AppOrder {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    items: parseItems(row.items),
    total: row.total,
    currency: row.currency,
    paymentStatus:
      row.paymentStatus === "paid" || row.paymentStatus === "failed"
        ? row.paymentStatus
        : "created",
    shippingStatus:
      row.shippingStatus === "packed" ||
      row.shippingStatus === "shipped" ||
      row.shippingStatus === "out_for_delivery" ||
      row.shippingStatus === "delivered"
        ? row.shippingStatus
        : "processing",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listOrders(limit = 200): Promise<AppOrder[]> {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toOrder);
}

export async function listOrdersByUserId(userId: string, limit = 100): Promise<AppOrder[]> {
  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toOrder);
}

export async function updateOrder(
  orderId: string,
  patch: OrderStatusPatch
): Promise<AppOrder | null> {
  try {
    const row = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(patch.shippingStatus !== undefined && { shippingStatus: patch.shippingStatus }),
        ...(patch.paymentStatus !== undefined && { paymentStatus: patch.paymentStatus }),
      },
    });
    return toOrder(row);
  } catch {
    return null;
  }
}
