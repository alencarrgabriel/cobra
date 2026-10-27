"""Câmara plenary votes end to end (spec votacoes)."""

from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors import queue, runner
from cobra_collectors.sources.camara import CamaraSource
from tests.camara_vote_files import (
    BALLOTS_HEADER,
    ORIENTATIONS_HEADER,
    PROPOSITIONS_HEADER,
    VOTES_HEADER,
    ballot,
    vote,
    write,
)

pytestmark = pytest.mark.db


# Nineteen more nominal votes that match, so one mismatch stays under the 5% limit.
OTHERS = [f"200-{i}" for i in range(19)]


def files(tmp_path: Path, *, broken: bool = False) -> dict[str, bytes]:
    d = tmp_path / "files"
    d.mkdir(exist_ok=True)
    return {
        "votacoes-2026.csv": write(d / "v.csv", VOTES_HEADER, [
            vote("100-1", yes=2, no=1, prop="555"),
            vote("100-2", yes=1, no=0, approved="0"),  # symbolic
            vote("100-3", yes=404, no=61),  # ballots in blank: count does not match
            vote("100-4", organ="CCJC", yes=1),
            *(vote(v, yes=1, day="2026-01-05") for v in OTHERS),
        ]),
        "votacoesVotos-2026.csv": write(d / "b.csv", BALLOTS_HEADER, [
            ballot("100-1", "204501", "Sim"),
            ballot("100-1", "999999", "Sim", party="PT", uf="SP"),  # not in the registry
            ballot("100-1", "204502", "Não" if not broken else "Sim"),
            ballot("100-3", "204501", ""),
            ballot("100-4", "204501", "Sim"),
            *(ballot(v, "204503", "Sim") for v in OTHERS),
        ]),
        "votacoesOrientacoes-2026.csv": write(d / "o.csv", ORIENTATIONS_HEADER, [
            {"idVotacao": "100-1", "siglaBancada": "Governo", "orientacao": "Sim"},
            {"idVotacao": "100-1", "siglaBancada": "Oposição", "orientacao": "Não"},
        ]),
        "votacoesProposicoes-2026.csv": write(d / "p.csv", PROPOSITIONS_HEADER, [
            {"idVotacao": "100-1", "proposicao_id": "555", "proposicao_titulo": "PL 11/2003",
             "proposicao_ementa": "Proíbe a veiculação de peças publicitárias.",
             "proposicao_siglaTipo": "PL"},
        ]),
    }  # fmt: skip


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.votes",
            "delete from core.politician_external_ids where source_id like 'votes-test-%'",
            "delete from core.politicians where source_id like 'votes-test-%'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    row = autocommit_conn.execute(
        """
        insert into core.politicians (civil_name, parliamentary_name, source, source_id,
          collected_at)
        values ('Deputada Teste', 'Deputada Teste', 'camara', 'votes-test-1', now())
        returning id
        """
    ).fetchone()
    assert row is not None
    autocommit_conn.execute(
        """
        insert into core.politician_external_ids (politician_id, system, external_id, source,
          source_id, collected_at)
        values (%s, 'camara', '204501', 'camara', 'votes-test-1', now())
        """,
        (row[0],),
    )
    yield autocommit_conn
    wipe()


def run(db: psycopg.Connection, url: str, tmp_path: Path, served: dict[str, bytes]) -> int:
    def handler(request: httpx.Request) -> httpx.Response:
        name = request.url.path.rsplit("/", 1)[-1]
        if name in served:
            return httpx.Response(200, content=served[name], headers={"content-type": "text/csv"})
        return httpx.Response(404)

    def make() -> CamaraSource:
        source = CamaraSource(vote_years=())
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    queue.enqueue(db, "camara", "votes", "2026", {"year": 2026})
    summary = runner.work(url, {"camara": make}, tmp_path, transport=httpx.MockTransport(handler))
    return summary.failed


def test_plenary_votes_ballots_and_orientations(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    for _ in range(2):  # a second run rewrites the year without duplicates
        assert run(clean, test_database_url, tmp_path, files(tmp_path)) == 0
    votes = clean.execute(
        """
        select source_id, nominal, approved, yes, no, quality_notes, proposition_label
        from core.votes where source_id like '100-%%' order by source_id
        """
    ).fetchall()
    assert votes == [
        ("100-1", True, True, 2, 1, [], "PL 11/2003"),
        ("100-2", False, False, 1, 0, [], None),
        ("100-3", True, True, 404, 61,
         ["votos individuais não conferem com o placar oficial"], None),
    ]  # fmt: skip
    ballots = clean.execute(
        """
        select v.source_id, b.external_id, b.option, b.party_acronym, b.uf,
               b.politician_id is not null
        from core.vote_ballots b join core.votes v on v.id = b.vote_id
        where v.source_id like '100-%%'
        order by v.source_id, b.external_id
        """
    ).fetchall()
    assert ballots == [
        ("100-1", "204501", "sim", "PL", "DF", True),
        ("100-1", "204502", "nao", "PL", "DF", False),
        ("100-1", "999999", "sim", "PT", "SP", False),
    ]
    orientations = clean.execute(
        "select bench, orientation from core.vote_orientations order by bench"
    ).fetchall()
    assert orientations == [("Governo", "sim"), ("Oposição", "nao")]


def test_a_broken_year_publishes_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    # Two of 21 nominal votes fail the count check: above the 5% limit.
    assert run(clean, test_database_url, tmp_path, files(tmp_path, broken=True)) == 1
    assert clean.execute("select count(*) from core.votes").fetchone() == (0,)
