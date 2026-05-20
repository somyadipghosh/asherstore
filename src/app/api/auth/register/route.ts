import { ID, Users } from "node-appwrite";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  appwriteErrorResponse,
  createAccountClient,
  createAdminClient,
  createProfile,
  getProfileByEmail,
  setSessionCookie,
  toAuthenticatedUser,
} from "@/lib/appwrite-server";
import { signToken } from "@/lib/auth";

export const runtime = "nodejs";

const e164PhoneRegex = /^\+[1-9]\d{6,14}$/;

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().trim().regex(e164PhoneRegex, "Phone must include country code"),
  favoriteTeam: z.string().trim().min(1),
  newsletter: z.boolean().optional().default(false),
});

async function rollbackAuthUserIfNeeded(userId: string) {
  try {
    const { client } = createAdminClient();
    const users = new Users(client);
    await users.delete(userId);
  } catch {
    // Best effort cleanup only.
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const { account } = createAccountClient();

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    let existing = null;

    try {
      existing = await getProfileByEmail(normalizedEmail);
    } catch (error) {
      return appwriteErrorResponse(error, "Failed to validate existing account");
    }

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const authUser = await account.create(
      ID.unique(),
      normalizedEmail,
      parsed.data.password,
      parsed.data.name.trim()
    );

    const passwordHash = await hash(parsed.data.password, 12);

    let profile;

    try {
      profile = await createProfile({
        userId: authUser.$id,
        email: normalizedEmail,
        name: parsed.data.name.trim(),
        favoriteTeam: parsed.data.favoriteTeam.trim(),
        phone: parsed.data.phone.trim(),
        newsletter: parsed.data.newsletter,
        passwordHash,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      await rollbackAuthUserIfNeeded(authUser.$id);
      return appwriteErrorResponse(error, "Failed to create user profile");
    }

    try {
      await account.createEmailPasswordSession(normalizedEmail, parsed.data.password);
    } catch (error) {
      return appwriteErrorResponse(error, "Account created but auto-login failed");
    }

    const user = toAuthenticatedUser(profile);

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to create account");
  }
}
