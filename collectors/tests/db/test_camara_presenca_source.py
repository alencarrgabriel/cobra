"""Câmara presence in plenary deliberative sessions end to end (spec presenca)."""

from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors import queue, runner
from cobra_collectors.sources.camara import CamaraSource

pytestmark = pytest.mark.db


def csv_bytes(header: list[str], rows: list[list[str]]) -> bytes:
    lines = [";".join(f'"{h}"' for h in header)] + [";".join(f'"{c}"' for c in r) for r in rows]
    return ("﻿" + "\r\n".join(lines) + "\r\n").encode("utf-8")


FILES = {
    "eventos-2026.csv": csv_bytes(
        ["id", "dataHoraInicio", "situacao", "descricaoTipo"],
        [
            ["1", "2026-06-09T14:00:00", "Encerrada", "Sessão Deliberativa"],
            ["2", "2026-06-10T14:00:00", "Encerrada (Final)", "Sessão Deliberativa"],
            ["3", "2026-06-11T10:00:00", "Encerrada", "Sessão Não Deliberativa Solene"],
            ["4", "2026-06-12T14:00:00", "Cancelada", "Sessão Deliberativa"],
            ["5", "2026-06-12T09:00:00", "Encerrada", "Sessão Deliberativa"],  # a committee
        ],
    ),
    "eventosOrgaos-2026.csv": csv_bytes(
        ["idEvento", "siglaOrgao"],
        [["1", "PLEN"], ["2", "PLEN"], ["3", "PLEN"], ["4", "PLEN"], ["5", "CCJC"]],
    ),
    "eventosPresencaDeputados-2026.csv": csv_bytes(
        ["idEvento", "idDeputado"],
        [["1", "204501"], ["1", "204502"], ["2", "204501"], ["3", "204502"], ["5", "204502"]],
    ),
}


def handler(request: httpx.Request) -> httpx.Response:
    name = request.url.path.rsplit("/", 1)[-1]
    if name in FILES:
        return httpx.Response(200, content=FILES[name], headers={"content-type": "text/csv"})
    return httpx.Response(404)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in ("delete from raw.responses", "delete from ops.jobs", "delete from ops.runs",
                    "delete from core.sessions"):  # fmt: skip
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def test_plenary_deliberative_sessions_only(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    def make() -> CamaraSource:
        source = CamaraSource(vote_years=())
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    for _ in range(2):  # a second run rewrites the year without duplicates
        queue.enqueue(clean, "camara", "attendance", "2026", {"year": 2026})
        summary = runner.work(
            test_database_url, {"camara": make}, tmp_path, transport=httpx.MockTransport(handler)
        )
        assert summary.failed == 0
    rows = clean.execute(
        """
        select s.source_id, s.held_on::text, a.external_id
        from core.sessions s left join core.session_attendance a on a.session_id = s.id
        order by s.source_id, a.external_id
        """
    ).fetchall()
    assert rows == [
        ("1", "2026-06-09", "204501"),
        ("1", "2026-06-09", "204502"),
        ("2", "2026-06-10", "204501"),
    ]
