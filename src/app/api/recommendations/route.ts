export const runtime = "nodejs";

import { recommendProducts } from "@/lib/recommendation";
import { z } from "zod";

const schema = z.object({
  viewedProductIds: z.array(z.string()).default([]),
  favoriteTeams: z.array(z.string()).default([])
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ products: [], message: "No items found" });
  }

  try {
    const result = await recommendProducts(parsed.data);
    return Response.json({ products: result });
  } catch {
    return Response.json({ products: [], message: "No items found" });
  }
}
