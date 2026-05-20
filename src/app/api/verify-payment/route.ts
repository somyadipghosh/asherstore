import crypto from "crypto";
import { ID, Permission, Role } from "node-appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteErrorResponse,
  createAdminClient,
  getCurrentUser,
} from "@/lib/appwrite-server";
import { checkoutItemsSchema, priceCheckoutItems } from "@/lib/checkout-payment";
import { fetchRazorpayOrder, fetchRazorpayPayment } from "@/lib/razorpay-api";
import { getRazorpayServerConfig } from "@/lib/razorpay-config";

export const runtime = "nodejs";

const schema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  items: checkoutItemsSchema,
  currency: z.literal("INR").default("INR"),
});

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function createDocumentWithFallback(
  collectionId: string,
  payloads: Array<Record<string, unknown>>,
  userId: string
) {
  const { databases } = createAdminClient();

  const permissions = [
    Permission.read(Role.user(userId)),
    Permission.read(Role.team("admin")),
    Permission.update(Role.team("admin")),
    Permission.delete(Role.team("admin")),
  ];

  let lastError: unknown;

  for (const payload of payloads) {
    try {
      return await databases.createDocument(
        appwriteConfig.databaseId,
        collectionId,
        ID.unique(),
        payload,
        permissions
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid verification payload" }, { status: 400 });
  }

  const razorpayConfig = getRazorpayServerConfig();
  if (razorpayConfig.missing.length) {
    return Response.json(
      {
        error: "Payment gateway is not configured",
        missing: razorpayConfig.missing,
      },
      { status: 503 }
    );
  }

  try {
    const { pricedItems, totalPaise, totalRupees } = await priceCheckoutItems(parsed.data.items);

    const expectedSignature = crypto
      .createHmac("sha256", razorpayConfig.keySecret)
      .update(`${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, parsed.data.razorpay_signature)) {
      return Response.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const [gatewayOrder, gatewayPayment] = await Promise.all([
      fetchRazorpayOrder(razorpayConfig, parsed.data.razorpay_order_id),
      fetchRazorpayPayment(razorpayConfig, parsed.data.razorpay_payment_id),
    ]);

    if (
      gatewayPayment.order_id !== parsed.data.razorpay_order_id ||
      gatewayOrder.id !== parsed.data.razorpay_order_id
    ) {
      return Response.json({ error: "Gateway order mismatch" }, { status: 400 });
    }

    if (typeof gatewayPayment.amount === "number" && gatewayPayment.amount !== totalPaise) {
      return Response.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    if (gatewayPayment.status !== "captured" && gatewayPayment.status !== "authorized") {
      return Response.json({ error: "Payment is not captured" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const sharedPayload = {
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      amount: totalRupees,
      status: "paid",
      userId: user.id,
      createdAt: now,
      currency: parsed.data.currency,
      userEmail: user.email,
      items: JSON.stringify(pricedItems),
      total: totalRupees,
      paymentStatus: "paid",
      shippingStatus: "processing",
    };

    const isUsingOrdersCollection =
      appwriteConfig.paymentsCollectionId === appwriteConfig.ordersCollectionId;

    const primaryPayloads = isUsingOrdersCollection
      ? [
          sharedPayload,
          {
            userId: user.id,
            userEmail: user.email,
            items: JSON.stringify(pricedItems),
            total: totalRupees,
            currency: parsed.data.currency,
            paymentStatus: "paid",
            shippingStatus: "processing",
          },
        ]
      : [
          {
            orderId: parsed.data.razorpay_order_id,
            paymentId: parsed.data.razorpay_payment_id,
            amount: totalRupees,
            status: "paid",
            userId: user.id,
            createdAt: now,
          },
          sharedPayload,
        ];

    const savedPaymentDoc = await createDocumentWithFallback(
      appwriteConfig.paymentsCollectionId,
      primaryPayloads,
      user.id
    );

    let commerceOrderId: string | null = null;

    if (!isUsingOrdersCollection) {
      try {
        const commerceOrder = await createDocumentWithFallback(
          appwriteConfig.ordersCollectionId,
          [
            {
              userId: user.id,
              userEmail: user.email,
              items: JSON.stringify(pricedItems),
              total: totalRupees,
              currency: parsed.data.currency,
              paymentStatus: "paid",
              shippingStatus: "processing",
            },
          ],
          user.id
        );

        commerceOrderId = commerceOrder.$id;
      } catch {
        commerceOrderId = null;
      }
    }

    return Response.json({
      success: true,
      order: {
        id: savedPaymentDoc.$id,
        orderId: parsed.data.razorpay_order_id,
        paymentId: parsed.data.razorpay_payment_id,
        amount: totalRupees,
        status: "paid",
        userId: user.id,
        createdAt: savedPaymentDoc.$createdAt,
      },
      commerceOrderId,
    });
  } catch (error) {
    return appwriteErrorResponse(error, "Payment verification failed");
  }
}
