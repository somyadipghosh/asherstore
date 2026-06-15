import '@/lib/env-loader'
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Account, Client, Databases, Query, Users } from "node-appwrite";
import { auth, currentUser } from "@clerk/nextjs/server";

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

/** Shape returned by all profile DB helpers. */
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
// Appwrite config and database helpers
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

/** Appwrite configuration used by server-side auth and DB helpers. */
export const appwriteConfig = resolveAppwriteConfig();

/** Creates an admin Appwrite client. */
export function createAdminClient() {
  const config = resolveAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);
  return { client };
}

/** Creates an account-scoped Appwrite client. */
export function createAccountClient() {
  const config = resolveAppwriteConfig();
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId);
  return { client, account: new Account(client) };
}

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

export function createAdminDatabase() {
  const { client } = createAdminClient();
  return new Databases(client);
}

function isAppwriteNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 404
  );
}

function mapProfileDocument(doc: Record<string, unknown>): UserProfileRecord {
  const id = typeof doc.$id === "string" ? doc.$id : typeof doc.id === "string" ? doc.id : "";
  const userId = typeof doc.userId === "string" ? doc.userId : id;
  const email = typeof doc.email === "string" ? doc.email : "";
  const name = typeof doc.name === "string" ? doc.name : "";
  const role = typeof doc.role === "string" ? doc.role : "user";
  const passwordHash = typeof doc.passwordHash === "string" ? doc.passwordHash : null;
  const favoriteTeam = typeof doc.favoriteTeam === "string" ? doc.favoriteTeam : "";
  const phone = typeof doc.phone === "string" ? doc.phone : "";
  const newsletter = Boolean(doc.newsletter);
  const createdAtValue =
    typeof doc.$createdAt === "string"
      ? doc.$createdAt
      : typeof doc.createdAt === "string"
      ? doc.createdAt
      : new Date().toISOString();

  return {
    id,
    userId,
    email,
    name,
    role,
    passwordHash,
    favoriteTeam,
    phone,
    newsletter,
    createdAt: new Date(createdAtValue),
  };
}

const profileCollectionId = process.env.APPWRITE_COLLECTION_PROFILES_ID || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || "";

export async function getProfileByUserId(userId: string): Promise<UserProfileRecord | null> {
  if (!userId) return null;
  const db = createAdminDatabase();

  try {
    const profile = await db.getDocument(databaseId, profileCollectionId, userId);
    return mapProfileDocument(profile as Record<string, unknown>);
  } catch (error) {
    if (!isAppwriteNotFound(error)) throw error;
  }

  try {
    const response = await db.listDocuments(databaseId, profileCollectionId, [Query.equal("userId", userId), Query.limit(1)]);
    return response.documents.length ? mapProfileDocument(response.documents[0] as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function getProfileByEmail(email: string): Promise<UserProfileRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const db = createAdminDatabase();
  const response = await db.listDocuments(databaseId, profileCollectionId, [Query.equal("email", normalized), Query.limit(1)]);
  return response.documents.length ? mapProfileDocument(response.documents[0] as Record<string, unknown>) : null;
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
  const db = createAdminDatabase();

  const profile = await db.createDocument(databaseId, profileCollectionId, params.userId, {
    userId: params.userId,
    email: params.email.trim().toLowerCase(),
    name: params.name.trim() || "User",
    role,
    favoriteTeam: params.favoriteTeam?.trim() || "",
    phone: params.phone?.trim() || "",
    newsletter: params.newsletter ?? false,
    passwordHash: params.passwordHash?.trim() || null,
    createdAt: params.createdAt ?? new Date().toISOString(),
  });

  return mapProfileDocument(profile as Record<string, unknown>);
}

export async function updateProfileFavoriteTeam(
  profileId: string,
  favoriteTeam: string
): Promise<UserProfileRecord> {
  const db = createAdminDatabase();
  const updated = await db.updateDocument(databaseId, profileCollectionId, profileId, {
    favoriteTeam: favoriteTeam.trim(),
  });
  return mapProfileDocument(updated as Record<string, unknown>);
}

export async function updateProfilePasswordHash(
  profileId: string,
  passwordHash: string
): Promise<void> {
  const normalized = passwordHash.trim();
  if (!normalized) return;
  const db = createAdminDatabase();
  await db.updateDocument(databaseId, profileCollectionId, profileId, {
    passwordHash: normalized,
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
  const db = createAdminDatabase();
  const updated = await db.updateDocument(databaseId, profileCollectionId, profileId, {
    userId: params.userId,
    email: params.email.trim().toLowerCase(),
    name: params.name.trim() || "User",
    role: params.role,
  });
  return mapProfileDocument(updated as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// getCurrentUser – reads JWT from cookie, fetches profile from DB
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const { userId } = await auth();
    if (userId) {
      const clerkUser = await currentUser();
      if (clerkUser) {
        const email = clerkUser.emailAddresses[0]?.emailAddress || "";
        const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User";
        const adminEmails = (process.env.ADMIN_EMAILS || "")
          .split(",")
          .map((e) => e.trim().toLowerCase());
        const role: AppRole = adminEmails.includes(email.toLowerCase()) ? "admin" : "user";

        return {
          id: clerkUser.id,
          name,
          email,
          role,
          favoriteTeam: "",
          favoriteTeams: [],
          phone: clerkUser.phoneNumbers[0]?.phoneNumber || "",
          newsletter: false,
        };
      }
    }
  } catch (error) {
    console.error("Clerk auth check failed in getCurrentUser:", error);
  }

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
