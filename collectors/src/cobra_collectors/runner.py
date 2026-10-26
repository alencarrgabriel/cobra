"""Queue worker and run log: `enqueue`, `work` and `status` (DDR §6.2, RNF-17)."""

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import psycopg
import structlog
from psycopg.rows import dict_row

from cobra_collectors import queue
from cobra_collectors.http import HttpClient
from cobra_collectors.pipeline import Source, run_job
from cobra_collectors.ratelimit import RateLimiter
from cobra_collectors.raw import RawStore

log = structlog.get_logger()

SourceFactory = Callable[[], Source]


@dataclass(frozen=True)
class RunSummary:
    run_id: int
    done: int
    failed: int
    status: str


def enqueue_source(conn: psycopg.Connection, source: Source) -> int:
    """Queues every job of a full refresh. Returns how many were new."""
    return sum(
        queue.enqueue(conn, source.name, spec.kind, spec.dedupe_key, spec.payload)
        for spec in source.plan()
    )


def work(
    database_url: str,
    registry: Mapping[str, SourceFactory],
    raw_dir: Path,
    *,
    only: str | None = None,
    max_jobs: int | None = None,
    transport: httpx.BaseTransport | None = None,
) -> RunSummary:
    """Processes queued jobs until the queue is empty or `max_jobs` is reached."""
    sources: dict[str, Source] = {}
    clients: dict[str, HttpClient] = {}
    done = failed = 0
    with (
        psycopg.connect(database_url, autocommit=True) as ops_conn,
        psycopg.connect(database_url) as job_conn,
    ):
        queue.requeue_stale(ops_conn)
        row = ops_conn.execute(
            "insert into ops.runs (source) values (%s) returning id", (only,)
        ).fetchone()
        run_id = int(row[0]) if row else 0
        raw = RawStore(ops_conn, raw_dir)
        try:
            while max_jobs is None or done + failed < max_jobs:
                job = queue.claim(ops_conn, only)
                if job is None:
                    break
                factory = registry.get(job.source)
                if factory is None:
                    queue.fail(ops_conn, job, f"no adapter registered for source {job.source!r}")
                    failed += 1
                    continue
                source = sources.setdefault(job.source, factory())
                http = clients.setdefault(
                    job.source,
                    HttpClient(
                        RateLimiter(source.rate_per_second, source.burst), transport=transport
                    ),
                )
                # Any failure marks the job as failed and the worker moves on.
                try:
                    run_job(source, job, job_conn, http, raw, ops_conn)
                except Exception as error:
                    retried = queue.fail(ops_conn, job, f"{type(error).__name__}: {error}")
                    log.warning(
                        "job.failed",
                        source=job.source,
                        kind=job.kind,
                        job=job.id,
                        retried=retried,
                        error=str(error),
                    )
                    failed += 1
                else:
                    queue.complete(ops_conn, job.id)
                    done += 1
        finally:
            for client in clients.values():
                client.close()
            status = "ok" if failed == 0 else ("failed" if done == 0 else "partial")
            ops_conn.execute(
                "update ops.runs set finished_at = now(), status = %s, jobs_done = %s, "
                "jobs_failed = %s where id = %s",
                (status, done, failed, run_id),
            )
    log.info("run.finished", run=run_id, done=done, failed=failed, status=status)
    return RunSummary(run_id, done, failed, status)


def status(conn: psycopg.Connection) -> dict[str, Any]:
    """Per source: last run and job counts by status."""
    with conn.cursor(row_factory=dict_row) as cur:
        runs = cur.execute(
            """
            select distinct on (coalesce(source::text, '(todas)'))
                   coalesce(source::text, '(todas)') as source, started_at, finished_at,
                   status::text as status, jobs_done, jobs_failed
            from ops.runs order by coalesce(source::text, '(todas)'), started_at desc
            """
        ).fetchall()
    return {"runs": runs, "jobs": queue.counts_by_status(conn)}
