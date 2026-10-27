"""Quota expenses end to end (spec despesas-da-cota)."""

from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors import queue, runner
from cobra_collectors.sources.camara import CamaraSource
from cobra_collectors.sources.senado import SenadoSource
from tests.expense_files import camara_row, camara_zip, senado_item

pytestmark = pytest.mark.db

CAMARA = camara_zip([
    camara_row("204501", "1", "COMBUSTÍVEIS E LUBRIFICANTES.", "POSTO X LTDA",
               "12.345.678/0001-90", "300.5"),
    camara_row("204501", "2", "PASSAGEM AÉREA - RPA", "MARIA DE TAL", "123.456.789-01", "800",
               passenger="MARIA DE TAL"),
])  # fmt: skip
SENADO = [senado_item(1, 5672, "JOAO DA SILVA", "123.456.789-01", 250.0)]


def handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path.endswith("/cotas/Ano-2026.csv.zip"):
        return httpx.Response(200, content=CAMARA, headers={"content-type": "application/zip"})
    if path.endswith("/despesas_ceaps/2026"):
        return httpx.Response(200, json=SENADO)
    return httpx.Response(404)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in ("delete from raw.responses", "delete from ops.jobs", "delete from ops.runs",
                    "delete from core.expenses"):  # fmt: skip
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def test_expenses_of_both_houses_without_personal_data(
    clean: psycopg.Connection,
    test_database_url: str,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("cobra_collectors.sources.despesas.MIN_MEMBERS", {"camara": 1, "senado": 1})

    def camara() -> CamaraSource:
        source = CamaraSource(vote_years=())
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    def senado() -> SenadoSource:
        source = SenadoSource(vote_years=())
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    for _ in range(2):  # a second run rewrites the year without duplicates
        queue.enqueue(clean, "camara", "expenses", "2026", {"year": 2026})
        queue.enqueue(clean, "senado", "expenses", "2026", {"year": 2026})
        summary = runner.work(
            test_database_url, {"camara": camara, "senado": senado}, tmp_path,
            transport=httpx.MockTransport(handler),
        )  # fmt: skip
        assert summary.failed == 0
    rows = clean.execute(
        """
        select source::text, external_id, supplier_kind, supplier_name, value::text
        from core.expenses order by source, value
        """
    ).fetchall()
    assert rows == [
        ("camara", "204501", "empresa", "POSTO X LTDA", "300.50"),
        ("camara", "204501", "pessoa_fisica", None, "800.00"),
        ("senado", "5672", "pessoa_fisica", None, "250.00"),
    ]
    leaks = clean.execute(
        "select count(*) from core.expenses e "
        "where row_to_json(e)::text ~ '(MARIA|JOAO|12345678901|BSB|11111111111)'"
    ).fetchone()
    assert leaks == (0,)
