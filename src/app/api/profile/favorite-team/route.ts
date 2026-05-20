import { z } from "zod";

import {
  appwriteErrorResponse,
  getCurrentUser,
  getProfileByUserId,
  toAuthenticatedUser,
  updateProfileFavoriteTeam,
} from "@/lib/appwrite-server";

export const runtime = "nodejs";

const schema = z.object({
  favoriteTeam: z.string().trim().min(2).max(100),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid favorite team" }, { status: 400 });
  }

  try {
    const profile = await getProfileByUserId(user.id);

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    const updated = await updateProfileFavoriteTeam(profile.$id, parsed.data.favoriteTeam);

    return Response.json({ user: toAuthenticatedUser(updated) });
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to update favorite team");
  }
}
