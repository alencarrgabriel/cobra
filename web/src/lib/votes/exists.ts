import "server-only";

import { DataUnavailableError, withDb } from "@/lib/db";

/** Whether the vote exists; `null` when the database cannot be read (same rule as works). */
export async function voteExists(id: string): Promise<boolean | null> {
  if (!/^\d{1,12}$/.test(id)) return false;
  try {
    const rows = await withDb(
      (sql) => sql`select 1 from core.votes where id = ${Number(id)} limit 1`,
    );
    return rows.length > 0;
  } catch (error) {
    if (error instanceof DataUnavailableError) return null;
    throw error;
  }
}
