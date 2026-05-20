import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  Account,
  Client,
  Databases,
  Query,
  type Models,
} from "node-appwrite";

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

export const APPWRITE_SESSION_COOKIE = "asherstore-session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days — persistent login

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getConfiguredAdminEmails(): Set<string> {
  const source =
    process.env.ADMIN_EMAILS ||
    process.env.APPWRITE_ADMIN_EMAILS ||
    "";

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

const isProduction = process.env.NODE_ENV === "production";

function pickByEnv(devValue?: string, prodValue?: string): string {
  return (isProduction ? prodValue : devValue) || "";
}

function resolveConfig() {
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
    projectId: (projectId || "69c69d1c0001317b3d6a").trim(),
    apiKey: (process.env.APPWRITE_API_KEY || "").trim(),
    databaseId: (process.env.APPWRITE_DATABASE_ID || "asher_store_db").trim(),
    profilesCollectionId: (
      process.env.APPWRITE_COLLECTION_USERS_PROFILE_ID ||
      process.env.APPWRITE_COLLECTION_PROFILES_ID ||
      "users_profile"
    ).trim(),
    ordersCollectionId: (process.env.APPWRITE_COLLECTION_ORDERS_ID || "orders").trim(),
    paymentsCollectionId: (
      process.env.APPWRITE_COLLECTION_ID ||
      process.env.APPWRITE_COLLECTION_PAYMENTS_ID ||
      process.env.APPWRITE_COLLECTION_ORDERS_ID ||
      "orders"
    ).trim(),
    productsCollectionId: (process.env.APPWRITE_COLLECTION_PRODUCTS_ID || "products").trim(),
    storageBucketId: (
      process.env.APPWRITE_PRODUCTS_BUCKET_ID ||
      process.env.APPWRITE_BUCKET_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_BUCKET_ID ||
      "products-images"
    ).trim(),
    teamsCollectionId: (process.env.APPWRITE_COLLECTION_TEAMS_ID || "teams").trim(),
    wishlistCollectionId: (process.env.APPWRITE_COLLECTION_WISHLISTS_ID || "wishlists").trim(),
    reviewsCollectionId: (process.env.APPWRITE_COLLECTION_REVIEWS_ID || "reviews").trim(),
  } as const;
}

export const appwriteConfig = resolveConfig();

function withTimeout<T>(promise: Promise<T>, ms = 8000, label = "Appwrite"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function getAppwriteErrorMessage(error: unknown): string {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  )
    ? (error as { message: string }).message.toLowerCase()
    : "";
}

function isUnknownAttributeError(error: unknown, attribute: string): boolean {
  const message = getAppwriteErrorMessage(error);
  return message.includes("unknown attribute") && message.includes(attribute.toLowerCase());
}

function isMissingRequiredAttributeError(error: unknown, attribute: string): boolean {
  const message = getAppwriteErrorMessage(error);
  return message.includes("missing required attribute") && message.includes(attribute.toLowerCase());
}

function isProfileSchemaMismatchError(error: unknown): boolean {
  return (
    isUnknownAttributeError(error, "favoriteTeam") ||
    isUnknownAttributeError(error, "favoriteTeams") ||
    isMissingRequiredAttributeError(error, "favoriteTeam") ||
    isMissingRequiredAttributeError(error, "favoriteTeams") ||
    isUnknownAttributeError(error, "passwordHash") ||
    isMissingRequiredAttributeError(error, "passwordHash") ||
    isUnknownAttributeError(error, "createdAt") ||
    isMissingRequiredAttributeError(error, "createdAt")
  );
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function mapProfileDoc(profileDoc: Models.Document): AuthenticatedUser {
  const profile = profileDoc as unknown as Record<string, unknown>;
  const userId = typeof profile.userId === "string" ? profile.userId : profileDoc.$id;
  const email = typeof profile.email === "string" ? profile.email : "";
  const favoriteTeam =
    typeof profile.favoriteTeam === "string"
      ? profile.favoriteTeam
      : toStringList(profile.favoriteTeams)[0] || "";

  return {
    id: userId,
    name: typeof profile.name === "string" ? profile.name : "User",
    email,
    role: resolveRole(profile.role, email),
    favoriteTeam,
    favoriteTeams: favoriteTeam ? [favoriteTeam] : toStringList(profile.favoriteTeams),
    phone: (profile.phone as string) || "",
    newsletter: Boolean(profile.newsletter),
  };
}

export function createAccountClient() {
  const config = resolveConfig();

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

  return {
    client,
    account: new Account(client),
  };
}

export function createAdminClient() {
  const config = resolveConfig();

  if (!config.apiKey) {
    throw new Error("Missing APPWRITE_API_KEY. Add it to your env file.");
  }

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return {
    client,
    databases: new Databases(client),
  };
}

export async function getSessionSecretFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(APPWRITE_SESSION_COOKIE)?.value || null;
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

  response.cookies.set(APPWRITE_SESSION_COOKIE, sessionSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiry,
    maxAge,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(APPWRITE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getProfileByUserId(userId: string): Promise<Models.Document | null> {
  const config = resolveConfig();
  const { databases } = createAdminClient();
  const list = await withTimeout(
    databases.listDocuments(
      config.databaseId,
      config.profilesCollectionId,
      [Query.equal("userId", userId), Query.limit(1)]
    ),
    8000,
    "getProfileByUserId"
  );

  return list.documents[0] || null;
}

export async function getProfileByEmail(email: string): Promise<Models.Document | null> {
  const config = resolveConfig();
  const { databases } = createAdminClient();
  const list = await withTimeout(
    databases.listDocuments(
      config.databaseId,
      config.profilesCollectionId,
      [Query.equal("email", email), Query.limit(1)]
    ),
    8000,
    "getProfileByEmail"
  );

  return list.documents[0] || null;
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
}): Promise<Models.Document> {
  const config = resolveConfig();
  const { databases } = createAdminClient();
  const teamName = params.favoriteTeam?.trim() || "";
  const passwordHash = params.passwordHash?.trim() || "";
  const hasPasswordHash = Boolean(passwordHash);
  const basePayload = {
    userId: params.userId,
    email: params.email,
    name: params.name,
    role: params.role || roleForNewAccount(params.email),
    phone: params.phone || "",
    newsletter: params.newsletter ?? false,
  };
  const createdAt = params.createdAt || new Date().toISOString();

  const payloadVariants: Array<{
    includeCreatedAt: boolean;
    useFavoriteTeams: boolean;
    includePasswordHash: boolean;
  }> = [
    {
      includeCreatedAt: true,
      useFavoriteTeams: false,
      includePasswordHash: hasPasswordHash,
    },
    {
      includeCreatedAt: true,
      useFavoriteTeams: true,
      includePasswordHash: hasPasswordHash,
    },
    {
      includeCreatedAt: false,
      useFavoriteTeams: false,
      includePasswordHash: hasPasswordHash,
    },
    {
      includeCreatedAt: false,
      useFavoriteTeams: true,
      includePasswordHash: hasPasswordHash,
    },
  ];

  if (hasPasswordHash) {
    payloadVariants.push(
      {
        includeCreatedAt: true,
        useFavoriteTeams: false,
        includePasswordHash: false,
      },
      {
        includeCreatedAt: true,
        useFavoriteTeams: true,
        includePasswordHash: false,
      },
      {
        includeCreatedAt: false,
        useFavoriteTeams: false,
        includePasswordHash: false,
      },
      {
        includeCreatedAt: false,
        useFavoriteTeams: true,
        includePasswordHash: false,
      }
    );
  }

  let lastError: unknown = null;

  for (const variant of payloadVariants) {
    const payload: Record<string, unknown> = {
      ...basePayload,
      ...(variant.includeCreatedAt ? { createdAt } : {}),
      ...(variant.includePasswordHash ? { passwordHash } : {}),
      ...(variant.useFavoriteTeams
        ? { favoriteTeams: teamName ? [teamName] : [] }
        : { favoriteTeam: teamName }),
    };

    try {
      return await databases.createDocument<Models.DefaultDocument>(
        config.databaseId,
        config.profilesCollectionId,
        params.userId,
        payload,
        []
      );
    } catch (error) {
      lastError = error;

      if (!isProfileSchemaMismatchError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function updateProfileFavoriteTeam(
  profileDocumentId: string,
  favoriteTeam: string
): Promise<Models.Document> {
  const config = resolveConfig();
  const { databases } = createAdminClient();
  const teamName = favoriteTeam.trim();
  const favoriteTeamPayload = { favoriteTeam: teamName } as unknown as Partial<Models.Document>;
  const favoriteTeamsPayload = {
    favoriteTeams: teamName ? [teamName] : [],
  } as unknown as Partial<Models.Document>;

  try {
    return await databases.updateDocument(
      config.databaseId,
      config.profilesCollectionId,
      profileDocumentId,
      favoriteTeamPayload
    );
  } catch (error) {
    const shouldRetryWithFavoriteTeams =
      isUnknownAttributeError(error, "favoriteTeam") ||
      isMissingRequiredAttributeError(error, "favoriteTeams");

    if (!shouldRetryWithFavoriteTeams) {
      throw error;
    }

    return databases.updateDocument(
      config.databaseId,
      config.profilesCollectionId,
      profileDocumentId,
      favoriteTeamsPayload
    );
  }
}

export async function updateProfilePasswordHash(
  profileDocumentId: string,
  passwordHash: string
): Promise<void> {
  const normalizedHash = passwordHash.trim();
  if (!normalizedHash) return;

  const config = resolveConfig();
  const { databases } = createAdminClient();

  try {
    await databases.updateDocument(
      config.databaseId,
      config.profilesCollectionId,
      profileDocumentId,
      { passwordHash: normalizedHash } as unknown as Partial<Models.Document>
    );
  } catch (error) {
    if (isUnknownAttributeError(error, "passwordHash")) {
      return;
    }

    throw error;
  }
}

export async function updateProfileOAuthIdentity(
  profileDocumentId: string,
  params: {
    userId: string;
    email: string;
    name: string;
    role: AppRole;
  }
): Promise<Models.Document> {
  const config = resolveConfig();
  const { databases } = createAdminClient();

  const payloadWithRole = {
    userId: params.userId,
    email: params.email,
    name: params.name,
    role: params.role,
  } as unknown as Partial<Models.Document>;

  try {
    return await databases.updateDocument(
      config.databaseId,
      config.profilesCollectionId,
      profileDocumentId,
      payloadWithRole
    );
  } catch (error) {
    // Some legacy schemas may not have a role column. Keep OAuth identity in sync anyway.
    if (!isUnknownAttributeError(error, "role")) {
      throw error;
    }

    return databases.updateDocument(
      config.databaseId,
      config.profilesCollectionId,
      profileDocumentId,
      {
        userId: params.userId,
        email: params.email,
        name: params.name,
      } as unknown as Partial<Models.Document>
    );
  }
}

export function toAuthenticatedUser(profileDoc: Models.Document): AuthenticatedUser {
  return mapProfileDoc(profileDoc);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const token = await getSessionSecretFromCookies();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const profile = await getProfileByUserId(payload.id);
    return profile ? mapProfileDoc(profile) : null;
  } catch {
    return null;
  }
}

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

export function isAppwriteUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 401
  );
}