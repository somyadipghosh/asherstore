export const runtime = "nodejs";

import { assertAdminAccess } from "@/lib/admin-guard";
import { listOrders } from "@/lib/appwrite-orders";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

export async function GET() {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  try {
    const orders = await listOrders();
    return Response.json({ orders });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load orders");
  }
}
