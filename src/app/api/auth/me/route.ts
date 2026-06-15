import { getCurrentUser } from "@/lib/appwrite-server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ user: null, message: "Not authenticated" });
  }

  return Response.json({ 
    user,
    debug: {
      adminEmails: process.env.ADMIN_EMAILS || "",
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "present" : "missing",
      clerkSecretKey: process.env.CLERK_SECRET_KEY ? "present" : "missing",
      clerkUser: user.email ? "checked" : "none",
    }
  });
}

