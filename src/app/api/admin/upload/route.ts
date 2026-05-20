export const runtime = "nodejs";

import { writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

import { assertAdminAccess } from "@/lib/admin-guard";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return map[mimeType] || "bin";
}

export async function POST(request: Request) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return Response.json(
      { error: `Unsupported file type: ${mimeType}. Allowed: jpeg, png, webp, gif, avif` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileId = crypto.randomUUID();
    const ext = getExtension(mimeType);
    const filename = `${fileId}.${ext}`;

    const uploadDir = join(process.cwd(), "public", "uploads");
    const filePath = join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const url = `/api/images/${encodeURIComponent(fileId)}`;

    return Response.json({ fileId, url });
  } catch (error) {
    console.error("[admin/upload] Failed to save file", error);
    return Response.json({ error: "Failed to save uploaded file" }, { status: 500 });
  }
}
