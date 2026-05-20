export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { filterProducts, listProducts, listProductsByTeam } from "@/lib/appwrite-products";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

function toNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const team = params.get("team");
  const version = params.get("version");
  const min = toNumber(params.get("min"));
  const max = toNumber(params.get("max"));
  const q = params.get("q")?.toLowerCase().trim();

  try {
    const source = team ? await listProductsByTeam(team) : await listProducts();
    const filtered = filterProducts(source, { team, version, min, max, q });

    return Response.json({ products: filtered });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load products");
  }
}
