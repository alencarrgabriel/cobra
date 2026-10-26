"""Fetch → raw → validate → publish (spec coleta-de-dados: Validação antes de publicar)."""

from collections.abc import Iterator
from pathlib import Path

import psycopg
import pytest

from cobra_collectors import runner

from .example_source import ExampleSource, transport

pytestmark = pytest.mark.db

GOOD = {
    1: [{"id": 901, "sigla": "EXA", "nome": "Partido Exemplo A"}],
    2: [{"id": 902, "sigla": "EXB", "nome": "Partido Exemplo B"}],
}
BAD = {
    1: [
        {"id": 903, "sigla": "EXC", "nome": "Partido Exemplo C"},
        {"id": 904, "sigla": "", "nome": "Sem sigla"},
    ]
}


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        autocommit_conn.execute("delete from raw.responses")
        autocommit_conn.execute("delete from ops.jobs")
        autocommit_conn.execute("delete from ops.runs")
        autocommit_conn.execute("delete from core.parties where source = 'cobra'")

    wipe()
    yield autocommit_conn
    wipe()


def run(
    test_database_url: str, tmp_path: Path, pages: dict[int, list[dict[str, object]]]
) -> runner.RunSummary:
    return runner.work(
        test_database_url, {"cobra": ExampleSource}, tmp_path, transport=transport(pages)
    )


def test_successful_jobs_publish_and_keep_raw(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    assert runner.enqueue_source(clean, ExampleSource()) == 2
    summary = run(test_database_url, tmp_path, GOOD)
    assert (summary.done, summary.failed, summary.status) == (2, 0, "ok")
    parties = clean.execute(
        "select acronym from core.parties where source = 'cobra' order by 1"
    ).fetchall()
    assert parties == [("EXA",), ("EXB",)]
    assert clean.execute(
        "select count(*) from raw.responses where source = 'cobra'"
    ).fetchone() == (2,)
    run_row = clean.execute("select status::text, jobs_done, jobs_failed from ops.runs").fetchone()
    assert run_row == ("ok", 2, 0)


def test_validation_failure_publishes_nothing_but_keeps_raw_and_error(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    runner.enqueue_source(clean, ExampleSource())
    summary = run(test_database_url, tmp_path, BAD)
    # page 1 fails validation; page 2 is empty and succeeds
    assert (summary.done, summary.failed, summary.status) == (1, 1, "partial")
    assert clean.execute("select count(*) from core.parties where source = 'cobra'").fetchone() == (
        0,
    )
    assert clean.execute(
        "select count(*) from raw.responses where source = 'cobra'"
    ).fetchone() == (2,)
    error = clean.execute(
        "select status::text, last_error from ops.jobs where payload->>'pagina' = '1'"
    ).fetchone()
    assert error is not None
    assert error[0] == "queued"  # will be retried later
    assert "ValidationError: partido 904 sem sigla" in error[1]


def test_unknown_source_fails_the_job(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    clean.execute("insert into ops.jobs (source, kind, dedupe_key) values ('senado', 'x', 'y')")
    summary = runner.work(test_database_url, {}, tmp_path)
    assert summary.failed == 1
    assert clean.execute("select last_error from ops.jobs").fetchone() == (
        "no adapter registered for source 'senado'",
    )


def test_status_reports_last_run_and_job_counts(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    runner.enqueue_source(clean, ExampleSource())
    run(test_database_url, tmp_path, GOOD)
    report = runner.status(clean)
    assert report["jobs"] == [{"source": "cobra", "status": "done", "total": 2}]
    assert report["runs"][0]["status"] == "ok"
