import '@/lib/env-loader';
export const runtime = "nodejs";

import { readFile } from "fs/promises";
import { join } from "path";

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const ALLOWED_EXTENSIONS = Object.keys(MIME_MAP);

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;

  if (!fileId || !/^[\w-]+$/.test(fileId)) {
    return Response.json({ error: "Invalid file ID" }, { status: 400 });
  }

  // 1. Try to load from Appwrite Storage first
  try {
    const endpoint = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1").trim();
    const projectId = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6a24e8cd0033cc19a86e").trim();
    const bucketId = (process.env.APPWRITE_PRODUCTS_BUCKET_ID || "products-images").trim();
    const apiKey = (process.env.APPWRITE_API_KEY || "").trim();

    const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;
    
    const headers: Record<string, string> = {
      "X-Appwrite-Project": projectId,
    };
    if (apiKey) {
      headers["X-Appwrite-Key"] = apiKey;
    }

    const appwriteResponse = await fetch(url, { headers });

    if (appwriteResponse.ok) {
      const contentType = appwriteResponse.headers.get("Content-Type") || "application/octet-stream";
      const buffer = await appwriteResponse.arrayBuffer();

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (error) {
    console.error("[api/images] Appwrite fetch failed", error);
  }

  // 2. Fall back to local filesystem
  const uploadsDir = join(process.cwd(), "public", "uploads");

  for (const ext of ALLOWED_EXTENSIONS) {
    const filePath = join(uploadsDir, `${fileId}.${ext}`);
    try {
      const data = await readFile(filePath);
      const mimeType = MIME_MAP[ext] ?? "application/octet-stream";

      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // Try next extension.
    }
  }

  return Response.json({ error: "Image not found" }, { status: 404 });
}