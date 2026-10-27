import "server-only";

import { DataUnavailableError, withDb } from "@/lib/db";

import { parsePlanSlug } from "./slug";

/** Whether the plan exists; `null` when the database cannot be read (same rule as works). */
export async function planExists(slug: string): Promise<boolean | null> {
  const key = parsePlanSlug(slug);
  if (!key) return false;
  try {
    const rows = await withDb(
      (sql) => sql`
        select 1 from core.government_plans p
        left join core.localities l on l.ibge_code = p.uf_code
        where p.election_year = ${key.year} and p.office = ${key.office}
          and l.uf_abbr is not distinct from ${key.uf}
        limit 1`,
    );
    return rows.length > 0;
  } catch (error) {
    if (error instanceof DataUnavailableError) return null;
    throw error;
  }
}
