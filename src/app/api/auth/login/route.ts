import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

import {
  appwriteErrorResponse,
  createAccountClient,
  createProfile,
  getProfileByEmail,
  getProfileByUserId,
  setSessionCookie,
  toAuthenticatedUser,
  updateProfilePasswordHash,
} from "@/lib/appwrite-server";
import { signToken } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function buildAuthResponse(profile: Parameters<typeof toAuthenticatedUser>[0]) {
  const user = toAuthenticatedUser(profile);
  const token = signToken({ id: user.id, email: user.email, role: user.role });

  const response = NextResponse.json({ user });
  setSessionCookie(response, token);
  return response;
}

function hasPasswordHash(profile: Parameters<typeof toAuthenticatedUser>[0]): boolean {
  const candidate = profile as unknown as { passwordHash?: unknown };
  return typeof candidate.passwordHash === "string" && candidate.passwordHash.trim().length > 0;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const { account } = createAccountClient();
    const rawEmail = parsed.data.email.trim();
    const normalizedEmail = rawEmail.toLowerCase();
    const password = parsed.data.password;
    const session = await account.createEmailPasswordSession(normalizedEmail, password);
    const userId = typeof (session as { userId?: unknown }).userId === "string"
      ? (session as { userId: string }).userId
      : null;

    if (!userId) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    let profile = await getProfileByUserId(userId);

    if (!profile) {
      profile = await getProfileByEmail(normalizedEmail);
    }

    if (!profile) {
      const passwordHash = await hash(password, 12);

      profile = await createProfile({
        userId,
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0] || "User",
        favoriteTeam: "",
        newsletter: false,
        phone: "",
        passwordHash,
        createdAt: new Date().toISOString(),
      });
    }

    if (!hasPasswordHash(profile)) {
      const passwordHash = await hash(password, 12);
      await updateProfilePasswordHash(profile.$id, passwordHash).catch(() => {
        // Best effort sync only.
      });
    }

    return buildAuthResponse(profile);
  } catch (error) {
    return appwriteErrorResponse(error, "Invalid credentials");
  }
}
