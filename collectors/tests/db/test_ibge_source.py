"""IBGE municipalities (spec cadastro-de-representantes: Municípios disponíveis)."""

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import httpx
import psycopg
import pytest

from cobra_collectors import runner
from cobra_collectors.sources.ibge import IbgeSource, search_name

pytestmark = pytest.mark.db

SAMPLE: list[dict[str, Any]] = json.loads(
    (Path(__file__).parent.parent / "fixtures" / "ibge" / "municipios-amostra.json").read_text(
        encoding="utf-8"
    )
)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            # Brasília comes from a migration and other tests rely on it.
            "delete from core.localities where source = 'ibge' and kind = 'municipality' "
            "and ibge_code <> '5300108'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def collect(
    db: psycopg.Connection, url: str, tmp_path: Path, body: list[dict[str, Any]]
) -> runner.RunSummary:
    def make() -> IbgeSource:
        source = IbgeSource(minimum=10)
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    runner.enqueue_source(db, make())
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=body))
    return runner.work(url, {"ibge": make}, tmp_path, transport=transport)


def test_search_name() -> None:
    assert search_name("São Paulo") == "sao paulo"
    assert search_name("Alta Floresta D'Oeste") == "alta floresta d'oeste"


def test_load_and_search_without_accents(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    summary = collect(clean, test_database_url, tmp_path, SAMPLE)
    assert summary.failed == 0
    assert clean.execute(
        "select ibge_code, uf_code, name from core.localities where search_name = 'sao paulo' "
        "and kind = 'municipality'"
    ).fetchone() == ("3550308", "35", "São Paulo")
    brasilia = clean.execute(
        "select kind::text, name, uf_code, search_name from core.localities "
        "where ibge_code = '5300108'"
    ).fetchone()
    assert brasilia == ("municipality", "Brasília", "53", "brasilia")
    total = clean.execute(
        "select count(*) from core.localities where kind = 'municipality'"
    ).fetchone()
    assert total == (len(SAMPLE),)


def test_second_identical_run_adds_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, SAMPLE)
    collect(clean, test_database_url, tmp_path, SAMPLE)
    assert clean.execute(
        "select count(*) from core.localities where kind = 'municipality'"
    ).fetchone() == (len(SAMPLE),)


def test_short_answer_writes_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    summary = collect(clean, test_database_url, tmp_path, SAMPLE[:3])
    assert summary.failed == 1
    # Only Brasília, created by a migration, is left.
    assert clean.execute(
        "select count(*) from core.localities where source = 'ibge' and kind = 'municipality'"
    ).fetchone() == (1,)
