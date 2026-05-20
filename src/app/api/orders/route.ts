import {
  ID,
  Permission,
  Query,
  Role,
  type Models,
} from "node-appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteErrorResponse,
  createAdminClient,
  getCurrentUser,
} from "@/lib/appwrite-server";

export const runtime = "nodejs";

const schema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      size: z.enum(["S", "M", "L", "XL", "XXL", "XXXL"]),
      qty: z.number().min(1),
      price: z.number().min(1)
    })
  ),
  total: z.number().min(1),
  currency: z.string().default("INR")
});

function mapOrder(doc: Models.Document) {
  const data = doc as unknown as Record<string, unknown>;
  const parsedItems =
    typeof data.items === "string"
      ? (() => {
          try {
            const raw = JSON.parse(data.items) as unknown;
            return Array.isArray(raw) ? raw : [];
          } catch {
            return [];
          }
        })()
      : Array.isArray(data.items)
        ? data.items
        : [];

  return {
    id: doc.$id,
    userId: data.userId || "",
    items: parsedItems,
    total: typeof data.total === "number" ? data.total : 0,
    paymentStatus:
      typeof data.paymentStatus === "string" ? data.paymentStatus : "created",
    shippingStatus:
      typeof data.shippingStatus === "string" ? data.shippingStatus : "processing",
    createdAt: doc.$createdAt,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ orders: [], message: "No items found" });
  }

  try {
    const { databases } = createAdminClient();
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.ordersCollectionId,
      [
        Query.equal("userId", user.id),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]
    );

    return Response.json({ orders: result.documents.map(mapOrder) });
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
      message: "No items found"
    });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid order payload" }, { status: 400 });
  }

  try {
    const { databases } = createAdminClient();
    const created = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.ordersCollectionId,
      ID.unique(),
      {
        userId: user.id,
        userEmail: user.email,
        items: JSON.stringify(parsed.data.items),
        total: parsed.data.total,
        currency: parsed.data.currency,
        paymentStatus: "created",
        shippingStatus: "processing",
      },
      [
        Permission.read(Role.user(user.id)),
        Permission.read(Role.team("admin")),
        Permission.update(Role.team("admin")),
        Permission.delete(Role.team("admin")),
      ]
    );

    return Response.json({ order: mapOrder(created) }, { status: 201 });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to create order");
  }
}
