"""Work ↔ amendment links (spec emendas-parlamentares: Vínculo direto entre obra e emenda)."""

import copy
import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import httpx
import psycopg
import pytest

from cobra_collectors import queue, runner
from cobra_collectors.sources.obrasgov import ObrasgovSource
from tests.db.test_transparencia_source import CSV, collect, zipped

pytestmark = pytest.mark.db

EMPENHO = json.loads(
    (Path(__file__).parent.parent / "fixtures" / "obrasgov" / "empenho-28349.53-45.json").read_text(
        encoding="utf-8"
    )
)
WORK = "28349.53-45"


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.works where source = 'obrasgov'",
            "delete from core.amendments where source = 'transparencia'",
            "delete from core.amendment_authors where source = 'transparencia'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def commitments(
    db: psycopg.Connection, url: str, tmp_path: Path, body: dict[str, Any]
) -> runner.RunSummary:
    db.execute(
        """
        insert into core.works (name, status, uf_code, source, source_id, collected_at)
        values ('Obra de teste', 'in_progress', '53', 'obrasgov', %s, now())
        """,
        (WORK,),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/data-atualizacao"):
            return httpx.Response(200, json={"data_ultima_atualizacao": "2026-10-23"})
        return httpx.Response(200, json=body)

    def make() -> ObrasgovSource:
        source = ObrasgovSource()
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    queue.enqueue(db, "obrasgov", "commitments", WORK, {"id": WORK})
    return runner.work(url, {"obrasgov": make}, tmp_path, transport=httpx.MockTransport(handler))


def links(db: psycopg.Connection) -> list[tuple[Any, ...]]:
    return db.execute(
        """
        select a.source_id, l.confidence, au.name from core.work_amendment_links l
        join core.amendments a on a.id = l.amendment_id
        join core.amendment_authors au on au.id = l.author_id
        join core.works w on w.id = l.work_id where w.source_id = %s
        """,
        (WORK,),
    ).fetchall()


def test_author_and_number_with_the_commitment_year_link_directly(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    # Real case: commitment 2023NE000117 names "71080013" (Bancada do DF, amendment 0013).
    collect(clean, test_database_url, tmp_path, zipped(CSV))
    summary = commitments(clean, test_database_url, tmp_path, EMPENHO)
    assert summary.failed == 0
    assert links(clean) == [("202371080013", "direto", "BANCADA DO DISTRITO FEDERAL")]
    raw = clean.execute(
        "select amendment_ref_raw, amendment_code from core.work_commitments"
    ).fetchone()
    assert raw == ("71080013", "202371080013")


def test_full_code_links_directly(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, zipped(CSV))
    body = copy.deepcopy(EMPENHO)
    body["data"][0]["codigo_autor_emenda"] = "202542680008"
    commitments(clean, test_database_url, tmp_path, body)
    assert links(clean) == [("202542680008", "direto", "DAMARES ALVES")]


def test_unrecognised_reference_creates_no_link(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, zipped(CSV))
    body = copy.deepcopy(EMPENHO)
    body["data"][0]["codigo_autor_emenda"] = "20264268000.0"
    commitments(clean, test_database_url, tmp_path, body)
    assert links(clean) == []
    assert clean.execute(
        "select amendment_ref_raw, amendment_code from core.work_commitments"
    ).fetchone() == ("20264268000.0", None)


def test_amendments_by_function(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, zipped(CSV))
    rows = clean.execute("select * from core.amendments_by_function('53')").fetchall()
    total = sum(r[1] for r in rows)
    stored = clean.execute("select count(*) from core.amendments where uf_code = '53'").fetchone()
    assert stored is not None
    assert total == stored[0]
    assert all(r[2] >= r[4] for r in rows)  # committed >= paid
