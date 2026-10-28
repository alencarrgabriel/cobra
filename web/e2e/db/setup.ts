import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

// Throwaway database for browser tests: recreated with every migration and the seed.
export const E2E_DB = "cobra_e2e";

/** Fixed secret of the alerts sign-up in tests only (change alertas-cadastro). */
export const E2E_ALERTS_SECRET = Buffer.alloc(32, 7).toString("base64");

/** Fixed secret of the weekly summary trigger in tests only (change resumo-semanal). */
export const E2E_CRON_SECRET = Buffer.alloc(32, 9).toString("base64url");
const ROOT = path.resolve(__dirname, "../../..");

export function adminUrl(): string {
  return (
    process.env.E2E_ADMIN_DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
  );
}

export function e2eUrl(): string {
  const url = new URL(adminUrl());
  url.pathname = `/${E2E_DB}`;
  return url.toString();
}

export default async function globalSetup(): Promise<void> {
  const admin = postgres(adminUrl(), { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`drop database if exists ${E2E_DB} with (force)`);
    await admin.unsafe(`create database ${E2E_DB}`);
  } finally {
    await admin.end();
  }
  const db = postgres(e2eUrl(), { max: 1, onnotice: () => {} });
  try {
    const dir = path.join(ROOT, "supabase", "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      await db.unsafe(readFileSync(path.join(dir, file), "utf8")).simple();
    }
    const seed = path.join(__dirname, "seed.sql");
    await db.unsafe(readFileSync(seed, "utf8")).simple();
  } finally {
    await db.end();
  }
}
