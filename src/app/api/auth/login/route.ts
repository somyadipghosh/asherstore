import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";

import {
  createProfile,
  getProfileByEmail,
  setSessionCookie,
  toAuthenticatedUser,
} from "@/lib/appwrite-server";
import { signToken } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  try {
    const profile = await getProfileByEmail(normalizedEmail);

    if (!profile) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!profile.passwordHash) {
      // OAuth-only account — cannot log in with password
      return NextResponse.json(
        { error: "This account uses Google sign-in. Please use the Google login option." },
        { status: 401 }
      );
    }

    const valid = await compare(password, profile.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = toAuthenticatedUser(profile);
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
