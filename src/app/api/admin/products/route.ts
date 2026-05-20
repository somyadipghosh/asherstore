export const runtime = "nodejs";

import { z } from "zod";

import { assertAdminAccess } from "@/lib/admin-guard";
import { createProduct, listProducts } from "@/lib/appwrite-products";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

const sizeEnum = z.enum(["S", "M", "L", "XL", "XXL", "XXXL"]);
const versionEnum = z.enum(["sublimation", "master", "fan", "player", "special-edition", "clearance", "kids-kit"]);

const booleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean());

const imagesSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  return value;
}, z.array(z.string().trim().min(1).refine((item) => !item.includes("/") && !item.includes("http"), "images must contain fileId values")).min(1));

const sizesSchema = z.preprocess((value) => {
  const normalizeItem = (item: string) => item.trim().toUpperCase();

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(normalizeItem)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(normalizeItem)
      .filter(Boolean);
  }

  return value;
}, z.array(sizeEnum).min(1));

const createSchema = z.object({
  name: z.string().trim().min(3),
  team: z.string().trim().min(2),
  price: z.coerce.number().int().min(1),
  images: imagesSchema,
  version: z.preprocess(
    (value) => {
      const normalizeOne = (v: string): string => {
        const normalized = v.trim().toLowerCase();
        if (normalized === "sublimation") return "sublimation";
        if (normalized === "master") return "master";
        if (normalized === "player") return "player";
        if (normalized === "fan") return "fan";
        if (normalized === "special-edition" || normalized === "special edition" || normalized === "special edition version") {
          return "special-edition";
        }
        if (normalized === "clearance" || normalized === "clearance stock") return "clearance";
        if (normalized === "kids-kit" || normalized === "kids kit") return "kids-kit";
        return normalized;
      };
      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string").map(normalizeOne);
      }
      if (typeof value === "string") {
        return [normalizeOne(value)];
      }
      return value;
    },
    z.array(versionEnum).min(1)
  ),
  sizes: sizesSchema,
  description: z.string().trim().min(10),
  isMatchPick: booleanSchema.default(true),
  isBestSeller: booleanSchema.default(false)
});

function toId(): string {
  return `prod_${Date.now()}`;
}

function extractFailingField(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const message =
    "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "";

  const patterns = [
    /attribute\s+"([^"]+)"/i,
    /attribute\s+'([^']+)'/i,
    /field\s+"([^"]+)"/i,
    /field\s+'([^']+)'/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function getAppwriteErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: "Unknown error" };
  }

  const source = error as {
    message?: unknown;
    code?: unknown;
    type?: unknown;
    response?: unknown;
  };

  return {
    message: typeof source.message === "string" ? source.message : "Failed to create product",
    code: typeof source.code === "number" ? source.code : undefined,
    type: typeof source.type === "string" ? source.type : undefined,
    response: source.response,
  };
}

export async function GET() {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  try {
    const products = await listProducts();
    return Response.json({ products });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load products");
  }
}

export async function POST(request: Request) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".") || "payload";
      return `${path}: ${issue.message}`;
    });

    return Response.json({ error: "Invalid product payload", issues }, { status: 400 });
  }

  const payload = {
    id: toId(),
    name: parsed.data.name.trim(),
    team: parsed.data.team.trim(),
    price: Number(parsed.data.price),
    images: parsed.data.images.map((item) => item.trim()),
    version: parsed.data.version,
    sizes: parsed.data.sizes,
    description: parsed.data.description.trim(),
    rating: 1,
    isMatchPick: Boolean(parsed.data.isMatchPick),
    isBestSeller: Boolean(parsed.data.isBestSeller),
    tags: [],
    reviews: []
  };

  const containsNil = Object.values(payload).some((value) => value === undefined || value === null);
  if (containsNil) {
    return Response.json(
      { error: "Invalid product payload", issues: ["payload contains undefined or null values"] },
      { status: 400 }
    );
  }

  console.info("[api/admin/products] create payload", payload);

  try {
    const created = await createProduct(payload);
    return Response.json({ product: created }, { status: 201 });
  } catch (error) {
    const details = getAppwriteErrorDetails(error);
    const failingField = extractFailingField(error);
    console.error("[api/admin/products] create failed", details);

    return Response.json(
      { error: details.message, failingField, details },
      { status: details.code && details.code >= 400 && details.code <= 599 ? details.code : 500 }
    );
  }
}
