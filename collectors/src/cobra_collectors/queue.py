"""Job queue in Postgres (DDR §6.2): one worker per job, backoff retries, dead after the limit."""

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

RETRY_BASE = timedelta(minutes=1)
RETRY_CAP = timedelta(hours=6)
STALE_AFTER = timedelta(minutes=30)


@dataclass(frozen=True)
class Job:
    id: int
    source: str
    kind: str
    payload: dict[str, Any]
    attempts: int
    max_attempts: int


def enqueue(
    conn: psycopg.Connection,
    source: str,
    kind: str,
    dedupe_key: str,
    payload: dict[str, Any] | None = None,
    *,
    max_attempts: int = 5,
) -> bool:
    """Queues a job unless the same one is already pending. Returns True if it was queued."""
    cur = conn.execute(
        """
        insert into ops.jobs (source, kind, dedupe_key, payload, max_attempts)
        values (%s, %s, %s, %s, %s)
        on conflict (source, kind, dedupe_key) where status in ('queued', 'running') do nothing
        """,
        (source, kind, dedupe_key, Jsonb(payload or {}), max_attempts),
    )
    return cur.rowcount == 1


def claim(conn: psycopg.Connection, source: str | None = None) -> Job | None:
    """Takes the next ready job. `SKIP LOCKED` guarantees no job goes to two workers."""
    row = conn.execute(
        """
        update ops.jobs set status = 'running', locked_at = now(), attempts = attempts + 1,
                            updated_at = now()
        where id = (
          select id from ops.jobs
          where status = 'queued' and run_after <= now() and (%(source)s::core.data_source is null
                or source = %(source)s::core.data_source)
          order by run_after, id
          for update skip locked
          limit 1
        )
        returning id, source::text, kind, payload, attempts, max_attempts
        """,
        {"source": source},
    ).fetchone()
    if row is None:
        return None
    return Job(int(row[0]), row[1], row[2], row[3], int(row[4]), int(row[5]))


def complete(conn: psycopg.Connection, job_id: int) -> None:
    conn.execute(
        "update ops.jobs set status = 'done', locked_at = null, last_error = null, "
        "updated_at = now() where id = %s",
        (job_id,),
    )


def retry_delay(attempts: int) -> timedelta:
    """Exponential delay before the next attempt, capped."""
    exponent = min(max(0, attempts - 1), 16)  # 2**16 minutes is already far past the cap
    delay: timedelta = RETRY_BASE * (1 << exponent)
    return min(RETRY_CAP, delay)


def fail(conn: psycopg.Connection, job: Job, error: str) -> bool:
    """Records a failure. Returns True if the job will be retried, False if it is now dead."""
    retry = job.attempts < job.max_attempts
    conn.execute(
        """
        update ops.jobs
        set status = %s, locked_at = null, last_error = %s, updated_at = now(),
            run_after = case when %s then now() + %s else run_after end
        where id = %s
        """,
        (
            "queued" if retry else "failed",
            error[:2000],
            retry,
            retry_delay(job.attempts),
            job.id,
        ),
    )
    return retry


def requeue_stale(conn: psycopg.Connection) -> int:
    """Jobs left `running` by a dead process go back to the queue."""
    cur = conn.execute(
        "update ops.jobs set status = 'queued', locked_at = null, updated_at = now() "
        "where status = 'running' and locked_at < now() - %s",
        (STALE_AFTER,),
    )
    return cur.rowcount


def counts_by_status(conn: psycopg.Connection) -> list[dict[str, Any]]:
    with conn.cursor(row_factory=dict_row) as cur:
        return cur.execute(
            "select source::text as source, status::text as status, count(*) as total "
            "from ops.jobs group by 1, 2 order by 1, 2"
        ).fetchall()
