import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { appwriteErrorResponse, getCurrentUser } from "@/lib/appwrite-server";

export const runtime = "nodejs";

const schema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      size: z.enum(["S", "M", "L", "XL", "XXL", "XXXL"]),
      qty: z.number().min(1),
      price: z.number().min(1),
    })
  ),
  total: z.number().min(1),
  currency: z.string().default("INR"),
});

function mapRow(row: {
  id: string;
  userId: string;
  items: unknown;
  total: number;
  paymentStatus: string;
  shippingStatus: string;
  createdAt: Date;
}) {
  const parseItems = (raw: unknown) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw) as unknown[]; } catch { return []; }
    }
    return [];
  };

  return {
    id: row.id,
    userId: row.userId,
    items: parseItems(row.items),
    total: row.total,
    paymentStatus: row.paymentStatus,
    shippingStatus: row.shippingStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ orders: [], message: "No items found" });
  }

  try {
    const rows = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json({ orders: rows.map(mapRow) });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load orders");
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({
      order: null,
      error: "Please login to place an order",
      message: "No items found",
    });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid order payload" }, { status: 400 });
  }

  try {
    const row = await prisma.order.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        items: parsed.data.items,
        total: parsed.data.total,
        currency: parsed.data.currency,
        paymentStatus: "created",
        shippingStatus: "processing",
      },
    });

    return Response.json({ order: mapRow(row) }, { status: 201 });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to create order");
  }
}
