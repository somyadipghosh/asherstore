import { z } from "zod";

import { appwriteErrorResponse, getCurrentUser } from "@/lib/appwrite-server";
import { checkoutItemsSchema, priceCheckoutItems } from "@/lib/checkout-payment";
import { createRazorpayOrder } from "@/lib/razorpay-api";
import { getRazorpayServerConfig } from "@/lib/razorpay-config";

export const runtime = "nodejs";

const schema = z.object({
  items: checkoutItemsSchema,
  currency: z.string().default("INR")
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid checkout payload" }, { status: 400 });
  }

  const razorpayConfig = getRazorpayServerConfig();
  if (razorpayConfig.missing.length) {
    return Response.json(
      {
        error: "Payment gateway is not configured",
        missing: razorpayConfig.missing
      },
      { status: 503 }
    );
  }

  try {
    const { totalRupees, totalPaise } = await priceCheckoutItems(parsed.data.items);

    const order = await createRazorpayOrder(razorpayConfig, {
      amount: totalPaise,
      currency: parsed.data.currency,
      receipt: `receipt_${user.id}_${Date.now()}`.slice(0, 40),
      notes: {
        userId: user.id
      }
    });

    return Response.json({
      mode: "razorpay",
      orderId: order.id,
      amount: totalRupees,
      amountPaise: order.amount,
      currency: order.currency
    });
  } catch (error) {
    return appwriteErrorResponse(error, "Payment initialization failed");
  }
}
