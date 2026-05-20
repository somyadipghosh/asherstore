export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { appwriteErrorResponse } from "@/lib/appwrite-server";

const TEAMS_CACHE_TTL_MS = 60_000;

type TeamOption = { id: string; name: string };

let teamsCache: { teams: TeamOption[]; expiresAt: number } | null = null;

function getCachedTeams(): TeamOption[] | null {
  if (!teamsCache) return null;
  if (Date.now() > teamsCache.expiresAt) { teamsCache = null; return null; }
  return teamsCache.teams;
}

function setCachedTeams(teams: TeamOption[]) {
  teamsCache = { teams, expiresAt: Date.now() + TEAMS_CACHE_TTL_MS };
}

function teamsResponse(teams: TeamOption[]) {
  return Response.json(
    { teams },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } }
  );
}

export async function GET() {
  try {
    const cached = getCachedTeams();
    if (cached) return teamsResponse(cached);

    // Derive distinct teams from the products table.
    const rows = await prisma.product.findMany({
      select: { id: true, team: true },
      take: 500,
    });

    const byName = new Map<string, TeamOption>();
    for (const row of rows) {
      const key = row.team.trim().toLowerCase();
      if (!key) continue;
      if (!byName.has(key)) {
        byName.set(key, { id: `team-${row.id}`, name: row.team.trim() });
      }
    }

    const teams = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
    setCachedTeams(teams);
    return teamsResponse(teams);
  } catch (error) {
    return appwriteErrorResponse(error, "Failed to load teams");
  }
}
