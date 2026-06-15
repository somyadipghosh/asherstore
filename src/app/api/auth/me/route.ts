import { getCurrentUser } from "@/lib/appwrite-server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ user: null, message: "Not authenticated" });
  }

  return Response.json({ user });
}



