"""Privileges of the raw and ops schemas (spec acesso-ao-banco)."""

import psycopg
import pytest

from .test_access import as_role, expect_denied

pytestmark = pytest.mark.db


@pytest.mark.parametrize(
    "statement",
    [
        "select count(*) from ops.jobs",
        "select count(*) from ops.runs",
        "select count(*) from raw.responses",
    ],
)
def test_site_cannot_read_raw_or_ops(db: psycopg.Connection, statement: str) -> None:
    expect_denied(db, "cobra_web_reader", statement)


def test_collector_writes_raw_and_jobs(db: psycopg.Connection) -> None:
    with as_role(db, "cobra_collector"):
        db.execute(
            "insert into ops.jobs (source, kind, dedupe_key) values ('camara', 'probe', 'k1')"
        )
        db.execute(
            "insert into raw.responses (source, url, status_code, sha256, body_json) values "
            "('camara', 'https://example.org', 200, repeat('a', 64), '{}')"
        )
        db.execute("insert into ops.runs (source) values ('camara')")


def test_same_pending_job_is_not_queued_twice(db: psycopg.Connection) -> None:
    db.execute("insert into ops.jobs (source, kind, dedupe_key) values ('camara', 'k', 'x')")
    with pytest.raises(psycopg.errors.UniqueViolation), db.transaction():
        db.execute("insert into ops.jobs (source, kind, dedupe_key) values ('camara', 'k', 'x')")
    db.execute("update ops.jobs set status = 'done' where dedupe_key = 'x'")
    db.execute("insert into ops.jobs (source, kind, dedupe_key) values ('camara', 'k', 'x')")
