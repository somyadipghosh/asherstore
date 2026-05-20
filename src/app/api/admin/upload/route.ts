export const runtime = "nodejs";

import { ID, Storage } from "node-appwrite";
import { File as AppwriteFile } from "node-fetch-native-with-agent";

import { assertAdminAccess } from "@/lib/admin-guard";
import { appwriteConfig, createAdminClient } from "@/lib/appwrite-server";

function getUploadErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: "Unknown upload error" };
  }

  const source = error as {
    message?: unknown;
    code?: unknown;
    type?: unknown;
    response?: unknown;
  };

  return {
    message: typeof source.message === "string" ? source.message : "Failed to upload image",
    code: typeof source.code === "number" ? source.code : undefined,
    type: typeof source.type === "string" ? source.type : undefined,
    response: source.response,
  };
}

export async function POST(request: Request) {
  const adminCheck = await assertAdminAccess();
  if (!adminCheck.ok) return adminCheck.response;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!appwriteConfig.storageBucketId) {
    return Response.json(
      { error: "Missing APPWRITE_PRODUCTS_BUCKET_ID configuration" },
      { status: 500 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const uploadFile = new AppwriteFile([bytes], file.name || `upload-${Date.now()}`, {
      type: file.type || "application/octet-stream",
    });

    const { client } = createAdminClient();
    const storage = new Storage(client);
    const uploaded = await storage.createFile(
      appwriteConfig.storageBucketId,
      ID.unique(),
      uploadFile
    );

    const url = `/api/images/${encodeURIComponent(uploaded.$id)}`;

    return Response.json({ fileId: uploaded.$id, url });
  } catch (error) {
    const details = getUploadErrorDetails(error);
    console.error("[admin/upload] Appwrite upload failed", details);

    return Response.json(
      {
        error: details.message,
        details,
      },
      { status: 500 }
    );
  }
}
