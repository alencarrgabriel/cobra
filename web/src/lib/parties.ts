import "server-only";

import { cacheLife } from "next/cache";

import { type DbResult, tryDb, unwrap } from "@/lib/db";

import { NEUTRAL_PARTY_COLOR } from "./party-color";

// Curated party colors (core.party_colors, change identidade-de-partidos-e-ufs).
export { partyColor } from "./party-color";

export type PartyColors = Record<string, string>;

export async function getPartyColors(): Promise<PartyColors> {
  return unwrap(await cachedPartyColors());
}

async function cachedPartyColors(): Promise<DbResult<PartyColors>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<{ acronym: string; color: string }[]>`
      select acronym, color from core.party_colors`;
    return Object.fromEntries(rows.map((r) => [r.acronym, r.color]));
  });
  if (result.ok) cacheLife("days");
  else cacheLife("seconds");
  return result;
}

export { NEUTRAL_PARTY_COLOR };
