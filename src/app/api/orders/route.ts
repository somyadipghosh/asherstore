import { z } from "zod";

import { createOrder, listOrdersByUserId } from "@/lib/appwrite-orders";
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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ orders: [], message: "No items found" });
  }

  try {
    const rows = await listOrdersByUserId(user.id, 100);
    return Response.json({ orders: rows });
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
    const row = await createOrder({
      userId: user.id,
      userEmail: user.email,
      items: parsed.data.items,
      total: parsed.data.total,
      currency: parsed.data.currency,
      paymentStatus: "created",
      shippingStatus: "processing",
    });

    return Response.json({ order: row }, { status: 201 });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to create order");
  }
}
