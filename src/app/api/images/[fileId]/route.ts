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