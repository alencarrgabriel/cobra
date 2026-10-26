import "server-only";

import { DataUnavailableError, withDb } from "@/lib/db";

/** Obrasgov investment project codes look like "12345.53-01". */
const CODE = /^\d{1,12}\.\d{2}-\d{1,4}$/;

/**
 * Whether a work with this Obrasgov code is stored. `null` when the database cannot be read:
 * the page then shows that the data is unavailable instead of claiming the work does not exist.
 */
export async function workExists(code: string): Promise<boolean | null> {
  if (!CODE.test(code)) return false;
  try {
    const rows = await withDb(
      (sql) => sql`
        select 1 from core.works
        where source = 'obrasgov' and source_id = ${code} limit 1`,
    );
    return rows.length > 0;
  } catch (error) {
    if (error instanceof DataUnavailableError) return null;
    throw error;
  }
}
