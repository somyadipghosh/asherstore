import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  try {
    const existing = await getProfileByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hash(parsed.data.password, 12);

    // Generate a unique userId (cuid-like).
    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const profile = await createProfile({
      userId,
      email: normalizedEmail,
      name: parsed.data.name.trim(),
      favoriteTeam: parsed.data.favoriteTeam.trim(),
      phone: parsed.data.phone.trim(),
      newsletter: parsed.data.newsletter,
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const user = toAuthenticatedUser(profile);
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
