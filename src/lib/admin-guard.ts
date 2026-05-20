import { getCurrentUser } from "@/lib/appwrite-server";

export async function assertAdminAccess() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (user.role !== "admin") {
    return {
      ok: false as const,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, user };
}
