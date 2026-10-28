"""Health panel privileges (spec saude-integracoes): editors read the run log and the queue,
and only metadata of raw responses; the public site reads none of it."""

import psycopg
import pytest

from tests.db.test_access import as_role, expect_denied

pytestmark = pytest.mark.db


def test_editor_reads_runs_and_raw_metadata_only(db: psycopg.Connection) -> None:
    with as_role(db, "cobra_editor"):
        db.execute("select source, status, jobs_failed from ops.runs").fetchall()
        db.execute("select source, status, last_error from ops.jobs").fetchall()
        db.execute("select source, fetched_at, status_code from raw.responses").fetchall()
        db.execute("insert into ops.alerts_sent (day, sources) values ('2026-06-10', '{senado}')")
    expect_denied(db, "cobra_editor", "select body_json from raw.responses")
    expect_denied(db, "cobra_editor", "select body_text from raw.responses")
    expect_denied(db, "cobra_editor", "update ops.jobs set status = 'done'")
    expect_denied(db, "cobra_editor", "delete from ops.alerts_sent")


def test_site_reads_no_ops(db: psycopg.Connection) -> None:
    expect_denied(db, "cobra_web_reader", "select * from ops.runs")
    expect_denied(db, "cobra_web_reader", "select source from raw.responses")
