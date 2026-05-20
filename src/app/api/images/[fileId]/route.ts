export const runtime = "nodejs";

import { Storage } from "node-appwrite";

import { appwriteConfig, createAdminClient } from "@/lib/appwrite-server";

function getErrorPayload(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: "Failed to fetch image", code: 500 };
  }

  const source = error as { message?: unknown; code?: unknown; type?: unknown };

  return {
    message: typeof source.message === "string" ? source.message : "Failed to fetch image",
    code: typeof source.code === "number" ? source.code : 500,
    type: typeof source.type === "string" ? source.type : undefined,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;

  if (!appwriteConfig.storageBucketId) {
    return Response.json({ error: "Missing APPWRITE_PRODUCTS_BUCKET_ID configuration" }, { status: 500 });
  }

  try {
    const { client } = createAdminClient();
    const storage = new Storage(client);

    const [fileMeta, fileView] = await Promise.all([
      storage.getFile(appwriteConfig.storageBucketId, fileId),
      storage.getFileView(appwriteConfig.storageBucketId, fileId),
    ]);

    return new Response(fileView as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": fileMeta.mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const payload = getErrorPayload(error);

    return Response.json(
      { error: payload.message, type: payload.type },
      { status: payload.code >= 400 && payload.code <= 599 ? payload.code : 500 }
    );
  }
}
