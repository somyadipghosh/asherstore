export const runtime = "nodejs";

import { z } from "zod";

import { assertAdminAccess } from "@/lib/admin-guard";
import { deleteProduct, updateProduct } from "@/lib/appwrite-products";
import { appwriteErrorResponse, isAppwriteUnauthorized } from "@/lib/appwrite-server";

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

const tagsSchema = z.preprocess((value) => {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value;
}, z.array(z.string().min(1)));

const updateSchema = z.object({
  name: z.string().trim().min(3).optional(),
  team: z.string().trim().min(2).optional(),
  price: z.coerce.number().int().min(1).optional(),
  images: imagesSchema.optional(),
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
      if (value === undefined) return undefined;
      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string").map(normalizeOne);
      }
      if (typeof value === "string") {
        return [normalizeOne(value)];
      }
      return value;
    },
    z.array(versionEnum).min(1)
  ).optional(),
  sizes: sizesSchema.optional(),
  description: z.string().trim().min(10).optional(),
  tags: tagsSchema.optional(),
  isMatchPick: booleanSchema.optional(),
  isBestSeller: booleanSchema.optional()
});

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
    return { message: "Unknown Appwrite error" };
  }

  const source = error as {
    message?: unknown;
    code?: unknown;
    type?: unknown;
    response?: unknown;
  };

  return {
    message: typeof source.message === "string" ? source.message : "Failed to update product",
    code: typeof source.code === "number" ? source.code : undefined,
    type: typeof source.type === "string" ? source.type : undefined,
    response: source.response,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join(".") || "payload";
      return `${path}: ${issue.message}`;
    });

    return Response.json({ error: "Invalid update payload", issues }, { status: 400 });
  }

  try {
    const updated = await updateProduct(id, parsed.data);

    if (!updated) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ product: updated });
  } catch (error) {
    if (isAppwriteUnauthorized(error)) {
      return Response.json(
        {
          error:
            "Appwrite key cannot update products. Update APPWRITE_API_KEY scopes to include database/table write access, then restart/redeploy.",
        },
        { status: 500 }
      );
    }

    const details = getAppwriteErrorDetails(error);
    const failingField = extractFailingField(error);
    console.error("[api/admin/products/:id] update failed", details);

    return Response.json(
      {
        error: details.message,
        failingField,
        details,
      },
      { status: details.code && details.code >= 400 && details.code <= 599 ? details.code : 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await context.params;

  try {
    const deleted = await deleteProduct(id);
    if (!deleted) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (isAppwriteUnauthorized(error)) {
      return Response.json(
        {
          error:
            "Appwrite key cannot delete products. Update APPWRITE_API_KEY scopes to include database/table write access, then restart/redeploy.",
        },
        { status: 500 }
      );
    }

    return appwriteErrorResponse(error, "Failed to delete product");
  }
}
