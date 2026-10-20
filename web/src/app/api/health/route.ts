import { connection } from "next/server";

import { serverEnv } from "@/config/env";

import packageJson from "../../../../package.json";

export type HealthResponse = {
  status: "ok";
  version: string;
  commit: string | null;
};

// Answers "is the site process up?". Deliberately touches no database and no
// external API (RNF-04), so it stays green even when every data source is down.
export async function GET(): Promise<Response> {
  await connection(); // run per request, never served from a prerendered copy
  const body: HealthResponse = {
    status: "ok",
    version: packageJson.version,
    commit: serverEnv().APP_COMMIT_SHA ?? null,
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
