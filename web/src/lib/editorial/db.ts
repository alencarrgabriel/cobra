import "server-only";

import postgres from "postgres";

import { serverEnv } from "@/config/env";
import { DataUnavailableError } from "@/lib/db";

let client: postgres.Sql | undefined;

/** Connection of the editorial panel (role cobra_editor): reads core, writes editorial work. */
export function editorDb(): postgres.Sql {
  const url = serverEnv().EDITOR_DATABASE_URL;
  if (!url) throw new DataUnavailableError("EDITOR_DATABASE_URL is not set");
  client ??= postgres(url, {
    max: 3,
    idle_timeout: 30,
    connect_timeout: 5,
    connection: { statement_timeout: 10000, application_name: "cobra-painel" },
  });
  return client;
}
