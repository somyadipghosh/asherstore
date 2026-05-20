import { NextRequest, NextResponse } from "next/server";
import { Account, Client } from "node-appwrite";
import { hash } from "bcryptjs";

import {
  appwriteConfig,
  appwriteErrorResponse,
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

function parseCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.split(";").find((part) => part.trim().startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=").slice(1).join("=").trim());
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nextPath = params.get("next") || "/dashboard";
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";

  const cookieHeader = request.headers.get("cookie") || "";

  // Appwrite sets `a_session_<projectId>` after OAuth redirect
  const sessionCookieName = `a_session_${appwriteConfig.projectId}`;
  const legacySessionCookieName = `a_session_${appwriteConfig.projectId}_legacy`;
  const sessionValue =
    parseCookieValue(cookieHeader, sessionCookieName) ||
    parseCookieValue(cookieHeader, legacySessionCookieName);

  if (!sessionValue) {
    return NextResponse.redirect(new URL("/login?error=google_failed", request.url));
  }

  try {
    // Verify the Appwrite session using the session secret
    const client = new Client()
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId)
      .setSession(sessionValue);

    const account = new Account(client);
    const appwriteUser = await account.get();

    const userId = appwriteUser.$id;
    const email = appwriteUser.email.trim().toLowerCase();
    const name = appwriteUser.name || email.split("@")[0] || "User";

    // Find or create profile
    let profile = await getProfileByUserId(userId);
    if (!profile) {
      profile = await getProfileByEmail(email);
    }

    if (!profile) {
      // New user via OAuth — create profile with a random password hash placeholder
      const dummyHash = await hash(Math.random().toString(36) + Date.now().toString(), 12);
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
        profile = await updateProfileOAuthIdentity(profile.id, {
          userId,
          email,
          name,
          role: nextRole,
        });
      }
    }

    const user = toAuthenticatedUser(profile);
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const response = NextResponse.redirect(new URL(safeNext, request.url));
    setSessionCookie(response, token);
    return response;
  } catch (err) {
    return appwriteErrorResponse(err, "Google login failed");
  }
}
