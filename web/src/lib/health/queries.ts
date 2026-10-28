import "server-only";

import { serverEnv } from "@/config/env";
import { sendMail } from "@/lib/alerts/mail";
import { editorDb } from "@/lib/editorial/db";
import { logger } from "@/lib/logger";
import { siteUrl } from "@/lib/site";

import {
  HEALTH_LABEL,
  healthOf,
  type HealthStatus,
  needsAlert,
  type Source,
  SOURCE_NAME,
  SOURCES,
} from "./rules";

// Integrations health (change saude-integracoes): read from the collector's run log, queue
// and raw-response metadata, through the editor role.

export type SourceHealth = {
  source: Source;
  status: HealthStatus;
  lastRun: {
    startedAt: string;
    finishedAt: string | null;
    status: "running" | "ok" | "partial" | "failed";
    done: number;
    failed: number;
  } | null;
  lastSuccessAt: string | null;
  queue: { queued: number; running: number; failed: number };
  recentFailures: number;
  responses7d: number;
};

export type JobFailure = {
  source: string;
  kind: string;
  attempts: number;
  at: string;
  error: string;
};

export async function integrationHealth(now = new Date()): Promise<{
  sources: SourceHealth[];
  failures: JobFailure[];
}> {
  const sql = editorDb();
  const [runs, success, jobs, raw, failures] = await Promise.all([
    sql<
      {
        source: string;
        started_at: Date;
        finished_at: Date | null;
        status: "running" | "ok" | "partial" | "failed";
        jobs_done: number;
        jobs_failed: number;
      }[]
    >`
      select distinct on (source) source::text, started_at, finished_at, status::text,
             jobs_done, jobs_failed
      from ops.runs where source is not null
      order by source, started_at desc`,
    sql<{ source: string; at: Date }[]>`
      select source::text, max(coalesce(finished_at, started_at)) as at from ops.runs
      where status in ('ok', 'partial') and source is not null group by source`,
    sql<
      {
        source: string;
        queued: number;
        running: number;
        failed: number;
        recent: number;
      }[]
    >`
      select source::text,
             count(*) filter (where status = 'queued')::int as queued,
             count(*) filter (where status = 'running')::int as running,
             count(*) filter (where status = 'failed')::int as failed,
             count(*) filter (where status = 'failed'
               and created_at > now() - interval '7 days')::int as recent
      from ops.jobs group by source`,
    sql<{ source: string; n: number }[]>`
      select source::text, count(*)::int as n from raw.responses
      where fetched_at > now() - interval '7 days' group by source`,
    sql<
      {
        source: string;
        kind: string;
        attempts: number;
        updated_at: Date;
        last_error: string | null;
      }[]
    >`
      select source::text, kind, attempts, updated_at, last_error from ops.jobs
      where status = 'failed' and created_at > now() - interval '7 days'
      order by updated_at desc limit 20`,
  ]);
  const by = <T extends { source: string }>(rows: T[]) =>
    new Map(rows.map((r) => [r.source, r]));
  const runOf = by(runs);
  const successOf = by(success);
  const jobsOf = by(jobs);
  const rawOf = by(raw);
  const sources = SOURCES.map((source): SourceHealth => {
    const run = runOf.get(source);
    const job = jobsOf.get(source);
    const lastSuccessAt = successOf.get(source)?.at.toISOString() ?? null;
    const recentFailures = job?.recent ?? 0;
    const lastRun = run
      ? {
          startedAt: run.started_at.toISOString(),
          finishedAt: run.finished_at?.toISOString() ?? null,
          status: run.status,
          done: run.jobs_done,
          failed: run.jobs_failed,
        }
      : null;
    return {
      source,
      status: healthOf(source, { lastRun, lastSuccessAt, recentFailures }, now),
      lastRun,
      lastSuccessAt,
      queue: {
        queued: job?.queued ?? 0,
        running: job?.running ?? 0,
        failed: job?.failed ?? 0,
      },
      recentFailures,
      responses7d: rawOf.get(source)?.n ?? 0,
    };
  });
  return {
    sources,
    failures: failures.map((f) => ({
      source: f.source,
      kind: f.kind,
      attempts: f.attempts,
      at: f.updated_at.toISOString(),
      error: (f.last_error ?? "").slice(0, 300),
    })),
  };
}

/** The team's daily alert (design D4): at most one e-mail per day. */
export async function alertTeam(now = new Date()): Promise<string[]> {
  const { sources } = await integrationHealth(now);
  const bad = sources.filter((s) => needsAlert(s.status));
  if (bad.length === 0) return [];
  const names = bad.map((s) => s.source);
  const to = serverEnv().OPS_ALERT_EMAIL;
  if (!to) {
    (await logger()).warn("integrations need attention", { sources: names });
    return names;
  }
  const day = new Date(now.getTime() - 3 * 3_600_000)
    .toISOString()
    .slice(0, 10);
  const inserted = await editorDb()`
    insert into ops.alerts_sent (day, sources) values (${day}, ${names})
    on conflict (day) do nothing returning day`;
  if (inserted.length === 0) return names;
  await sendMail({
    to,
    subject: `Cobra: ${bad.length} ${bad.length === 1 ? "integração precisa" : "integrações precisam"} de atenção`,
    text: [
      ...bad.map(
        (s) => `- ${SOURCE_NAME[s.source]}: ${HEALTH_LABEL[s.status]}`,
      ),
      "",
      `Painel: ${new URL("/painel/saude", siteUrl()).toString()}`,
    ].join("\n"),
    idempotencyKey: `saude-${day}`,
  });
  return names;
}
