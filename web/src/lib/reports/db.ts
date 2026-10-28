import "server-only";

import postgres from "postgres";

import { serverEnv } from "@/config/env";
import { DataUnavailableError } from "@/lib/db";

let client: postgres.Sql | undefined;

/** Connection of the public report form (role cobra_reports): inserts reports only. */
export function reportsDb(): postgres.Sql {
  const url = serverEnv().REPORTS_DATABASE_URL;
  if (!url) throw new DataUnavailableError("REPORTS_DATABASE_URL is not set");
  client ??= postgres(url, {
    max: 2,
    idle_timeout: 30,
    connect_timeout: 5,
    connection: {
      statement_timeout: 10000,
      application_name: "cobra-reportes",
    },
  });
  return client;
}

export function reportsAvailable(): boolean {
  return Boolean(serverEnv().REPORTS_DATABASE_URL);
}
