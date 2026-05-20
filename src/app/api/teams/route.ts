import { Query, type Models } from "node-appwrite";

import {
  appwriteConfig,
  appwriteErrorResponse,
  createAdminClient,
} from "@/lib/appwrite-server";

export const runtime = "nodejs";

const TEAMS_CACHE_TTL_MS = 60_000;

type TeamOption = { id: string; name: string };

let teamsCache: {
  teams: TeamOption[];
  expiresAt: number;
} | null = null;

function mapTeam(doc: Models.Document) {
  const row = doc as unknown as Record<string, unknown>;

  return {
    id: doc.$id,
    name: typeof row.name === "string" ? row.name : "",
  };
}

function isMissingCollectionError(error: unknown): boolean {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
      ? (error as { code: number }).code
      : 0;

  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message.toLowerCase()
      : "";

  return code === 404 || message.includes("collection") || message.includes("not found");
}

function uniqTeams(input: TeamOption[]) {
  const byName = new Map<string, TeamOption>();

  for (const team of input) {
    const key = team.name.trim().toLowerCase();
    if (!key) continue;
    if (!byName.has(key)) {
      byName.set(key, team);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function getCachedTeams(): TeamOption[] | null {
  if (!teamsCache) return null;
  if (Date.now() > teamsCache.expiresAt) {
    teamsCache = null;
    return null;
  }

  return teamsCache.teams;
}

function setCachedTeams(teams: TeamOption[]) {
  teamsCache = {
    teams,
    expiresAt: Date.now() + TEAMS_CACHE_TTL_MS,
  };
}

function teamsResponse(teams: TeamOption[]) {
  return Response.json(
    { teams },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

async function listTeamsFromProductsCollection() {
  const { databases } = createAdminClient();
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.productsCollectionId,
    [Query.limit(500)]
  );

  const mapped = result.documents.map((doc) => {
    const row = doc as unknown as Record<string, unknown>;
    const name = typeof row.team === "string" ? row.team : "";

    return {
      id: `product-team-${doc.$id}`,
      name,
    };
  });

  return uniqTeams(mapped.filter((team) => Boolean(team.name)));
}

export async function GET() {
  try {
    const cached = getCachedTeams();
    if (cached) {
      return teamsResponse(cached);
    }

    const { databases } = createAdminClient();
    try {
      const result = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.teamsCollectionId,
        [Query.orderAsc("name"), Query.limit(200)]
      );

      const teams = uniqTeams(result.documents.map(mapTeam).filter((team) => Boolean(team.name)));
      setCachedTeams(teams);
      return teamsResponse(teams);
    } catch (error) {
      if (!isMissingCollectionError(error)) {
        return appwriteErrorResponse(error, "Failed to load teams");
      }

      const teamsFromProducts = await listTeamsFromProductsCollection();
      setCachedTeams(teamsFromProducts);
      return teamsResponse(teamsFromProducts);
    }
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load teams");
  }
}
