export const runtime = "nodejs";

import { getProductById } from "@/lib/appwrite-products";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const product = await getProductById(id);

    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ product });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load product");
  }
}
