import "server-only";

import { DataUnavailableError, withDb } from "@/lib/db";

/** Whether the report exists; `null` when the database cannot be read (same rule as works). */
export async function reportExists(code: string): Promise<boolean | null> {
  if (!/^\d{1,12}$/.test(code)) return false;
  try {
    const rows = await withDb(
      (sql) =>
        sql`select 1 from core.public_reports where id = ${Number(code)}`,
    );
    return rows.length > 0;
  } catch (error) {
    if (error instanceof DataUnavailableError) return null;
    throw error;
  }
}
