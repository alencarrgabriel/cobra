import "server-only";

import postgres from "postgres";

import { serverEnv } from "@/config/env";
import { DataUnavailableError } from "@/lib/db";

import { deriveKeys, type Keys } from "./crypto";

let client: postgres.Sql | undefined;
let keys: Keys | undefined;

/** Whether the sign-up can work: database, secret, and a way to deliver (design D4). */
export function alertsAvailable(): boolean {
  const env = serverEnv();
  return Boolean(
    env.ALERTS_DATABASE_URL &&
    env.ALERTS_SECRET &&
    (env.RESEND_API_KEY || env.APP_ENV !== "production"),
  );
}

/** Connection of the alerts sign-up (role cobra_alerts): subscriptions, links, access log. */
export function alertsDb(): postgres.Sql {
  const url = serverEnv().ALERTS_DATABASE_URL;
  if (!url) throw new DataUnavailableError("ALERTS_DATABASE_URL is not set");
  client ??= postgres(url, {
    max: 3,
    idle_timeout: 30,
    connect_timeout: 5,
    connection: { statement_timeout: 10000, application_name: "cobra-alertas" },
  });
  return client;
}

export function alertsKeys(): Keys {
  const secret = serverEnv().ALERTS_SECRET;
  if (!secret) throw new DataUnavailableError("ALERTS_SECRET is not set");
  keys ??= deriveKeys(secret);
  return keys;
}
