import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Account, Client, Users } from "node-appwrite";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export type AppRole = "user" | "admin";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  favoriteTeam: string;
  favoriteTeams: string[];
  phone: string;
  newsletter: boolean;
}

/** Shape returned by all profile DB helpers (mirrors Prisma UserProfile). */
export interface UserProfileRecord {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  passwordHash?: string | null;
  favoriteTeam: string;
  phone: string;
  newsletter: boolean;
  createdAt: Date;
}

export const SESSION_COOKIE = "asherstore-session";
/** @deprecated Alias for SESSION_COOKIE – kept for backwards compat */
export const APPWRITE_SESSION_COOKIE = SESSION_COOKIE;

const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getConfiguredAdminEmails(): Set<string> {
  const source = process.env.ADMIN_EMAILS || "";
  return new Set(
    source
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean)
  );
}

function resolveRole(roleValue: unknown, email: string): AppRole {
  if (roleValue === "admin") return "admin";
  return getConfiguredAdminEmails().has(normalizeEmail(email)) ? "admin" : "user";
}

export function roleForNewAccount(email: string): AppRole {
  return getConfiguredAdminEmails().has(normalizeEmail(email)) ? "admin" : "user";
}

// ---------------------------------------------------------------------------
// Minimal Appwrite config – kept ONLY for OAuth routes (oauth-sync, oauth-callback).
// No database operations use this anymore.
// ---------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === "production";

function pickByEnv(devValue?: string, prodValue?: string): string {
  return (isProduction ? prodValue : devValue) || "";
}

function resolveAppwriteConfig() {
  const endpoint =
    pickByEnv(
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT_DEVELOPMENT || process.env.APPWRITE_ENDPOINT_DEVELOPMENT,
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT_PRODUCTION || process.env.APPWRITE_ENDPOINT_PRODUCTION
    ) ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT;

  const projectId =
    pickByEnv(
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID_DEVELOPMENT || process.env.APPWRITE_PROJECT_ID_DEVELOPMENT,
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID_PRODUCTION || process.env.APPWRITE_PROJECT_ID_PRODUCTION
    ) ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_PROJECT_ID;

  return {
    endpoint: (endpoint || "https://nyc.cloud.appwrite.io/v1").trim(),
    projectId: (projectId || "").trim(),
    apiKey: (process.env.APPWRITE_API_KEY || "").trim(),
  } as const;
}

/** Minimal config used only by OAuth routes. */
export const appwriteConfig = resolveAppwriteConfig();

/** Creates an admin Appwrite client (OAuth routes only — NOT for DB). */
export function createAdminClient() {
  const config = resolveAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);
  return { client };
}

/** Creates an account-scoped Appwrite client (OAuth routes only). */
export function createAccountClient() {
  const config = resolveAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);
  return { client, account: new Account(client) };
}

// ---------------------------------------------------------------------------
// Session / cookie helpers
// ---------------------------------------------------------------------------

export async function getSessionSecretFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}

export function setSessionCookie(
  response: NextResponse,
  sessionSecret: string,
  expireAt?: string
) {
  const expiry = expireAt
    ? new Date(expireAt)
    : new Date(Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000);

  const maxAge = Math.max(1, Math.floor((expiry.getTime() - Date.now()) / 1000));

  response.cookies.set(SESSION_COOKIE, sessionSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiry,
    maxAge,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

// ---------------------------------------------------------------------------
// Profile → AuthenticatedUser mapping
// ---------------------------------------------------------------------------

function mapProfile(profile: UserProfileRecord): AuthenticatedUser {
  const favoriteTeam = profile.favoriteTeam || "";

  return {
    id: profile.userId,
    name: profile.name || "User",
    email: profile.email,
    role: resolveRole(profile.role, profile.email),
    favoriteTeam,
    favoriteTeams: favoriteTeam ? [favoriteTeam] : [],
    phone: profile.phone || "",
    newsletter: Boolean(profile.newsletter),
  };
}

export function toAuthenticatedUser(profile: UserProfileRecord): AuthenticatedUser {
  return mapProfile(profile);
}

// ---------------------------------------------------------------------------
// Profile DB helpers (Prisma)
// ---------------------------------------------------------------------------

export async function getProfileByUserId(userId: string): Promise<UserProfileRecord | null> {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export async function getProfileByEmail(email: string): Promise<UserProfileRecord | null> {
  return prisma.userProfile.findUnique({ where: { email: email.trim().toLowerCase() } });
}

export async function createProfile(params: {
  userId: string;
  email: string;
  name: string;
  role?: AppRole;
  favoriteTeam?: string;
  phone?: string;
  newsletter?: boolean;
  passwordHash?: string;
  createdAt?: string;
}): Promise<UserProfileRecord> {
  const role = params.role ?? roleForNewAccount(params.email);

  return prisma.userProfile.create({
    data: {
      userId: params.userId,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim() || "User",
      role,
      favoriteTeam: params.favoriteTeam?.trim() || "",
      phone: params.phone?.trim() || "",
      newsletter: params.newsletter ?? false,
      passwordHash: params.passwordHash?.trim() || null,
    },
  });
}

export async function updateProfileFavoriteTeam(
  profileId: string,
  favoriteTeam: string
): Promise<UserProfileRecord> {
  return prisma.userProfile.update({
    where: { id: profileId },
    data: { favoriteTeam: favoriteTeam.trim() },
  });
}

export async function updateProfilePasswordHash(
  profileId: string,
  passwordHash: string
): Promise<void> {
  const normalized = passwordHash.trim();
  if (!normalized) return;

  await prisma.userProfile.update({
    where: { id: profileId },
    data: { passwordHash: normalized },
  });
}

export async function updateProfileOAuthIdentity(
  profileId: string,
  params: {
    userId: string;
    email: string;
    name: string;
    role: AppRole;
  }
): Promise<UserProfileRecord> {
  return prisma.userProfile.update({
    where: { id: profileId },
    data: {
      userId: params.userId,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim() || "User",
      role: params.role,
    },
  });
}

// ---------------------------------------------------------------------------
// getCurrentUser – reads JWT from cookie, fetches profile from DB
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = await getSessionSecretFromCookies();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const profile = await getProfileByUserId(payload.id);
    return profile ? mapProfile(profile) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export function appwriteErrorResponse(error: unknown, fallbackMessage: string) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
      ? (error as { code: number }).code
      : 500;

  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : fallbackMessage;

  return Response.json(
    { error: message },
    { status: status >= 400 && status <= 599 ? status : 500 }
  );
}

/** Generic unauthorised-error check (HTTP 401). */
export function isAppwriteUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 401
  );
}

// Keep Users export for OAuth routes that need it.
export { Users };
