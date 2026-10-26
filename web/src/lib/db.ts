import "server-only";

import postgres from "postgres";

import { serverEnv } from "@/config/env";

/** The database is not configured or not reachable; pages show "dados indisponíveis". */
export class DataUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Data unavailable: ${reason}`);
    this.name = "DataUnavailableError";
  }
}

let client: postgres.Sql | undefined;

/**
 * Read-only connection to the Cobra database (never to a government API, RNF-04).
 * In production the user belongs to the cobra_web_reader role.
 */
export function db(): postgres.Sql {
  const url = serverEnv().WEB_DATABASE_URL;
  if (!url) throw new DataUnavailableError("WEB_DATABASE_URL is not set");
  client ??= postgres(url, {
    max: 5,
    idle_timeout: 30,
    connect_timeout: 5,
    connection: { statement_timeout: 5000, application_name: "cobra-web" },
  });
  return client;
}

const UNREACHABLE = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "ECONNRESET",
]);

/** Runs a query, turning connection failures into DataUnavailableError. */
export async function withDb<T>(
  run: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  const sql = db();
  try {
    return await run(sql);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code && UNREACHABLE.has(code)) throw new DataUnavailableError(code);
    throw error;
  }
}

export type DbResult<T> =
  { ok: true; value: T } | { ok: false; unavailable: string };

/**
 * Like `withDb`, but reports an unavailable database as a value. Errors thrown inside a
 * `use cache` scope reach the page redacted in production, so cached reads return this and
 * the caller turns it back into DataUnavailableError with `unwrap`.
 */
export async function tryDb<T>(
  run: (sql: postgres.Sql) => Promise<T>,
): Promise<DbResult<T>> {
  try {
    return { ok: true, value: await withDb(run) };
  } catch (error) {
    if (error instanceof DataUnavailableError) {
      return { ok: false, unavailable: error.reason };
    }
    throw error;
  }
}

export function unwrap<T>(result: DbResult<T>): T {
  if (!result.ok) throw new DataUnavailableError(result.unavailable);
  return result.value;
}
