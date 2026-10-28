import { createHash, timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { serverEnv } from "@/config/env";
import { alertsAvailable } from "@/lib/alerts/db";
import { runWeeklyDigest } from "@/lib/alerts/digest";
import { previousWeek, weekOf } from "@/lib/alerts/digest-text";

// Weekly summary trigger (change resumo-semanal, design D1), meant to run every day. Needs
// `Authorization: Bearer <CRON_SECRET>`; without the secret configured it does not exist.
// GET too, because schedulers such as Vercel cron call by GET.

const notFound = () => new Response("Not found", { status: 404 });

function authorized(request: Request, secret: string): boolean {
  const given = request.headers.get("authorization") ?? "";
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(given), digest(`Bearer ${secret}`));
}

async function run(request: Request): Promise<Response> {
  await connection();
  const env = serverEnv();
  if (!env.CRON_SECRET || !authorized(request, env.CRON_SECRET)) {
    return notFound();
  }
  if (!alertsAvailable()) {
    return Response.json({ error: "alertas indisponíveis" }, { status: 503 });
  }
  // A chosen week only outside production, for tests and manual runs.
  const chosen = new URL(request.url).searchParams.get("semana");
  const week =
    chosen && env.APP_ENV !== "production" && /^\d{4}-\d{2}-\d{2}$/.test(chosen)
      ? weekOf(new Date(`${chosen}T12:00:00Z`))
      : previousWeek(new Date());
  return Response.json(await runWeeklyDigest(week), {
    headers: { "Cache-Control": "no-store" },
  });
}

export const GET = run;
export const POST = run;
