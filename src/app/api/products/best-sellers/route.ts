export const runtime = "nodejs";

import { listBestSellers } from "@/lib/appwrite-products";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

export async function GET() {
  try {
    const products = await listBestSellers(12);
    return Response.json({ products });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load best sellers");
  }
}
