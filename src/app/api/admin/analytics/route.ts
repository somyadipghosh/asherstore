export const runtime = "nodejs";

import { assertAdminAccess } from "@/lib/admin-guard";
import { listOrders } from "@/lib/appwrite-orders";
import { listProducts } from "@/lib/appwrite-products";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

export async function GET() {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  try {
    const [orders, products] = await Promise.all([listOrders(), listProducts()]);

    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const delivered = orders.filter((order) => order.shippingStatus === "delivered").length;
    const processing = orders.filter((order) => order.shippingStatus !== "delivered").length;

    const skuSales = new Map<string, number>();

    for (const order of orders) {
      for (const item of order.items || []) {
        skuSales.set(item.productId, (skuSales.get(item.productId) || 0) + item.qty);
      }
    }

    const topProducts = Array.from(skuSales.entries())
      .map(([productId, qty]) => {
        const product = products.find((entry) => entry.id === productId);
        return {
          productId,
          name: product?.name || productId,
          qty
        };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return Response.json({
      totalOrders,
      revenue,
      delivered,
      processing,
      totalProducts: products.length,
      topProducts
    });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load analytics");
  }
}
