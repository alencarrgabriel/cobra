"""Senate plenary votes end to end (spec votacoes)."""

from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors import queue, runner
from cobra_collectors.sources.senado import SenadoSource
from tests.senado_vote_data import ballot, official, vote

pytestmark = pytest.mark.db

VOTES = [
    vote(7001, 1, [ballot(5672, "Sim"), ballot(5673, "Não"), ballot(5674, "MIS")]),
    vote(7002, 2, [ballot(5672, "Votou")], secret=True, totals=(41, 1, 0)),
]
ORIENTATIONS = {"votacoes": [official(1, 1, 1, {"Governo": "SIM"})]}


def handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path.endswith("/dadosabertos/votacao.json"):
        return httpx.Response(200, json=VOTES)
    if path.endswith("/orientacaoBancada/20260101/20261231.json"):
        return httpx.Response(200, json=ORIENTATIONS)
    return httpx.Response(404)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.votes",
            "delete from core.politician_external_ids where source_id like 'sen-votes-%'",
            "delete from core.politicians where source_id like 'sen-votes-%'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    row = autocommit_conn.execute(
        """
        insert into core.politicians (civil_name, parliamentary_name, source, source_id,
          collected_at)
        values ('Senador Teste', 'Senador Teste', 'senado', 'sen-votes-1', now())
        returning id
        """
    ).fetchone()
    assert row is not None
    autocommit_conn.execute(
        """
        insert into core.politician_external_ids (politician_id, system, external_id, source,
          source_id, collected_at)
        values (%s, 'senado', '5672', 'senado', 'sen-votes-1', now())
        """,
        (row[0],),
    )
    yield autocommit_conn
    wipe()


def test_senate_votes_secret_and_absences(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    def make() -> SenadoSource:
        source = SenadoSource(vote_years=())
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    for _ in range(2):
        queue.enqueue(clean, "senado", "votes", "2026", {"year": 2026})
        summary = runner.work(
            test_database_url, {"senado": make}, tmp_path, transport=httpx.MockTransport(handler)
        )
        assert summary.failed == 0
    votes = clean.execute(
        "select source_id, nominal, secret, yes, no from core.votes order by source_id"
    ).fetchall()
    assert votes == [("7001", True, False, 1, 1), ("7002", False, True, 41, 1)]
    ballots = clean.execute(
        """
        select b.external_id, b.option, b.option_detail, b.politician_id is not null
        from core.vote_ballots b order by b.external_id
        """
    ).fetchall()
    assert ballots == [
        ("5672", "sim", None, True),
        ("5673", "nao", None, False),
        ("5674", "ausente", "Missão da Casa no País/exterior", False),
    ]
    assert clean.execute("select bench, orientation from core.vote_orientations").fetchall() == [
        ("Governo", "sim")
    ]
