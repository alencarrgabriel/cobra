"""Job queue (spec coleta-de-dados: Fila de tarefas)."""

import psycopg
import pytest

from cobra_collectors import queue

pytestmark = pytest.mark.db


@pytest.fixture
def q(autocommit_conn: psycopg.Connection) -> psycopg.Connection:
    autocommit_conn.execute("delete from raw.responses")
    autocommit_conn.execute("delete from ops.jobs")
    return autocommit_conn


def test_enqueue_deduplicates_pending_jobs(q: psycopg.Connection) -> None:
    assert queue.enqueue(q, "camara", "page", "p1", {"pagina": 1})
    assert not queue.enqueue(q, "camara", "page", "p1", {"pagina": 1})
    assert q.execute("select count(*) from ops.jobs").fetchone() == (1,)


def test_claim_marks_running_and_counts_attempt(q: psycopg.Connection) -> None:
    queue.enqueue(q, "camara", "page", "p1", {"pagina": 1})
    job = queue.claim(q)
    assert job is not None
    assert (job.kind, job.payload, job.attempts) == ("page", {"pagina": 1}, 1)
    assert queue.claim(q) is None


def test_two_workers_never_get_the_same_job(q: psycopg.Connection, test_database_url: str) -> None:
    queue.enqueue(q, "camara", "page", "a")
    queue.enqueue(q, "camara", "page", "b")
    with psycopg.connect(test_database_url) as w1, psycopg.connect(test_database_url) as w2:
        j1 = queue.claim(w1)  # transaction stays open: row locked
        j2 = queue.claim(w2)
        assert j1 is not None
        assert j2 is not None
        assert j1.id != j2.id
        w1.commit()
        w2.commit()


def test_claim_filters_by_source(q: psycopg.Connection) -> None:
    queue.enqueue(q, "camara", "page", "a")
    queue.enqueue(q, "senado", "page", "b")
    job = queue.claim(q, "senado")
    assert job is not None
    assert job.source == "senado"


def test_claim_tolerates_the_clock_stepping_back(q: psycopg.Connection) -> None:
    # As if the clock went back 1 s between enqueue and claim (seen on Docker Desktop).
    queue.enqueue(q, "camara", "page", "p1")
    q.execute("update ops.jobs set run_after = now() + interval '1 second'")
    assert queue.claim(q) is not None


def test_failure_reschedules_with_backoff(q: psycopg.Connection) -> None:
    queue.enqueue(q, "camara", "page", "a")
    job = queue.claim(q)
    assert job is not None
    assert queue.fail(q, job, "HTTP 503")
    row = q.execute(
        "select status::text, last_error, run_after > now() + interval '50 seconds' from ops.jobs"
    ).fetchone()
    assert row == ("queued", "HTTP 503", True)
    assert queue.claim(q) is None  # not ready yet


def test_last_attempt_marks_job_dead(q: psycopg.Connection) -> None:
    queue.enqueue(q, "camara", "page", "a", max_attempts=1)
    job = queue.claim(q)
    assert job is not None
    assert not queue.fail(q, job, "HTTP 503")
    assert q.execute("select status::text from ops.jobs").fetchone() == ("failed",)
    assert queue.claim(q) is None


def test_complete(q: psycopg.Connection) -> None:
    queue.enqueue(q, "camara", "page", "a")
    job = queue.claim(q)
    assert job is not None
    queue.complete(q, job.id)
    assert q.execute("select status::text from ops.jobs").fetchone() == ("done",)
    assert queue.enqueue(q, "camara", "page", "a")  # done jobs do not block re-queueing


def test_stale_running_jobs_return_to_the_queue(q: psycopg.Connection) -> None:
    queue.enqueue(q, "camara", "page", "a")
    queue.claim(q)
    q.execute("update ops.jobs set locked_at = now() - interval '2 hours'")
    assert queue.requeue_stale(q) == 1
    assert queue.claim(q) is not None


def test_retry_delay_grows_and_is_capped() -> None:
    assert queue.retry_delay(1) < queue.retry_delay(2) < queue.retry_delay(3)
    assert queue.retry_delay(50) == queue.RETRY_CAP
