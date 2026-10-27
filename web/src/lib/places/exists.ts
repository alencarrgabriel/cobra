import "server-only";

import { DataUnavailableError, withDb } from "@/lib/db";

/** IBGE codes: 2 digits for a UF, 7 for a municipality. */
const CODE = /^\d{2}(\d{5})?$/;

/** Whether the place exists; `null` when the database cannot be read (same rule as works). */
export async function placeExists(code: string): Promise<boolean | null> {
  if (!CODE.test(code)) return false;
  try {
    const rows = await withDb(
      (sql) =>
        sql`select 1 from core.localities where ibge_code = ${code} limit 1`,
    );
    return rows.length > 0;
  } catch (error) {
    if (error instanceof DataUnavailableError) return null;
    throw error;
  }
}
