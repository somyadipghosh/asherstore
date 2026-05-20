import { NextResponse } from "next/server";
import { Account, Client, Users } from "node-appwrite";
import { hash } from "bcryptjs";
import { z } from "zod";

import {
  appwriteConfig,
  appwriteErrorResponse,
  createAdminClient,
  createProfile,
  getProfileByEmail,
  getProfileByUserId,
  roleForNewAccount,
  setSessionCookie,
  toAuthenticatedUser,
  updateProfileOAuthIdentity,
} from "@/lib/appwrite-server";
import { signToken } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().min(1),
  secret: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { userId, secret } = parsed.data;

  try {
    // Exchange OAuth callback credentials for a real Appwrite session.
    const tokenClient = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);

    const account = new Account(tokenClient);
    await account.createSession(userId, secret);

    // Fetch trusted user profile from Appwrite using server API key.
    const { client: adminClient } = createAdminClient();
    const users = new Users(adminClient);
    const appwriteUser = await users.get(userId);

    if (!appwriteUser || appwriteUser.$id !== userId) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const email = appwriteUser.email.trim().toLowerCase();
    const name = appwriteUser.name || email.split("@")[0] || "User";

    // Find or create profile
    let profile = await getProfileByUserId(userId);
    if (!profile) {
      profile = await getProfileByEmail(email);
    }

    if (!profile) {
      const dummyHash = await hash(
        `oauth-${userId}-${Date.now()}-${Math.random().toString(36)}`,
        12
      );
      profile = await createProfile({
        userId,
        email,
        name,
        role: roleForNewAccount(email),
        favoriteTeam: "",
        newsletter: false,
        phone: "",
        passwordHash: dummyHash,
        createdAt: new Date().toISOString(),
      });
    } else {
      const profileData = profile as unknown as {
        userId?: unknown;
        email?: unknown;
        name?: unknown;
        role?: unknown;
      };
      const normalizedName = name || email.split("@")[0] || "User";
      const existingUserId = typeof profileData.userId === "string" ? profileData.userId : "";
      const existingEmail =
        typeof profileData.email === "string" ? profileData.email.trim().toLowerCase() : "";
      const existingName = typeof profileData.name === "string" ? profileData.name.trim() : "";
      const existingRole = profileData.role;
      const nextRole = existingRole === "admin" ? "admin" : roleForNewAccount(email);

      if (
        existingUserId !== userId ||
        existingEmail !== email ||
        !existingName ||
        (existingRole !== "user" && existingRole !== "admin")
      ) {
        profile = await updateProfileOAuthIdentity(profile.$id, {
          userId,
          email,
          name: normalizedName,
          role: nextRole,
        });
      }
    }

    const user = toAuthenticatedUser(profile);
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    return appwriteErrorResponse(err, "Google sign-in failed");
  }
}
