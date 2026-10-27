import "server-only";

import { tryDb } from "@/lib/db";

/**
 * Current parliamentary name of a politician, for the address check in the Proxy:
 * the name, `null` when the id does not exist, `undefined` when the database cannot be read.
 */
export async function politicianName(
  id: number,
): Promise<string | null | undefined> {
  const result = await tryDb(async (sql) => {
    const [row] = await sql<{ name: string }[]>`
      select parliamentary_name as name from core.politicians where id = ${id}`;
    return row ? row.name : null;
  });
  return result.ok ? result.value : undefined;
}
