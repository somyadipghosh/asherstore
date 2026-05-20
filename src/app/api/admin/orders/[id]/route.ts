export const runtime = "nodejs";

import { z } from "zod";

import { assertAdminAccess } from "@/lib/admin-guard";
import { updateOrder } from "@/lib/appwrite-orders";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

const schema = z.object({
  shippingStatus: z.enum(["processing", "packed", "shipped", "out_for_delivery", "delivered"]).optional(),
  paymentStatus: z.enum(["created", "paid", "failed"]).optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid order update" }, { status: 400 });
  }

  try {
    const updated = await updateOrder(id, parsed.data);

    if (!updated) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    return Response.json({ order: updated });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to update order");
  }
}
