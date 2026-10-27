"""TSE candidacies and votes end to end (spec trajetoria-eleitoral)."""

from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors import queue, runner
from cobra_collectors.sources.tse import TseSource
from tests.tse_files import CANDIDACY_HEADER, VOTE_HEADER, candidacy, tse_zip, vote

pytestmark = pytest.mark.db

CANDIDACIES = tse_zip(
    "consulta_cand_2022",
    CANDIDACY_HEADER,
    {
        "DF": [
            # Matched by CPF.
            candidacy(year=2022, sq="70001", name="MARIA TESTE DA SILVA", birth="01/02/1970",
                      cpf="12345678901", ballot="MARIA TESTE", result="ELEITO POR QP"),
            # Matched by civil name and birth date, two rounds.
            candidacy(year=2022, sq="70002", name="JOAO TESTE SOUZA", birth="05/05/1960",
                      office="GOVERNADOR", result="2º TURNO"),
            candidacy(year=2022, sq="70002", name="JOAO TESTE SOUZA", birth="05/05/1960",
                      office="GOVERNADOR", result="NÃO ELEITO", round_=2),
            # Not in the registry: nothing kept.
            candidacy(year=2022, sq="70003", name="FULANO DE FORA", birth="09/09/1990",
                      cpf="99999999999"),
        ]
    },
)  # fmt: skip
VOTES = tse_zip(
    "votacao_candidato_munzona_2022",
    VOTE_HEADER,
    {
        "DF": [vote(sq="70001", votes=1000, zone=1), vote(sq="70001", votes=234, zone=2),
               vote(sq="70002", votes=500), vote(sq="70002", votes=400, round_=2),
               vote(sq="70003", votes=9)],
    },
)  # fmt: skip


def handler(request: httpx.Request) -> httpx.Response:
    name = request.url.path.rsplit("/", 1)[-1]
    files = {"consulta_cand_2022.zip": CANDIDACIES, "votacao_candidato_munzona_2022.zip": VOTES}
    if name in files:
        return httpx.Response(200, content=files[name], headers={"content-type": "application/zip"})
    return httpx.Response(404)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.candidacies",
            "delete from restricted.politician_private_ids where source_id like 'tse-test-%'",
            "delete from core.politicians where source_id like 'tse-test-%'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    maria = autocommit_conn.execute(
        """
        insert into core.politicians (civil_name, parliamentary_name, birth_date, source,
          source_id, collected_at)
        values ('Maria Teste da Silva', 'Maria Teste', '1970-02-01', 'camara', 'tse-test-1',
                now())
        returning id
        """
    ).fetchone()
    assert maria is not None
    autocommit_conn.execute(
        """
        insert into restricted.politician_private_ids (politician_id, cpf, source, source_id,
          collected_at)
        values (%s, '12345678901', 'camara', 'tse-test-1', now())
        """,
        (maria[0],),
    )
    autocommit_conn.execute(
        """
        insert into core.politicians (civil_name, parliamentary_name, birth_date, source,
          source_id, collected_at)
        values ('João Teste Souza', 'João Teste', '1960-05-05', 'senado', 'tse-test-2', now())
        """
    )
    yield autocommit_conn
    wipe()


def collect(db: psycopg.Connection, url: str, tmp_path: Path) -> runner.RunSummary:
    def make() -> TseSource:
        source = TseSource(min_recent=1)
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    queue.enqueue(db, "tse", "candidacies", "2022", {"year": 2022})
    return runner.work(url, {"tse": make}, tmp_path, transport=httpx.MockTransport(handler))


def test_candidacies_of_the_registry_with_votes_per_round(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    summary = collect(clean, test_database_url, tmp_path)
    assert summary.failed == 0
    rows = clean.execute(
        """
        select p.source_id, c.election_year, c.round, c.office, c.ballot_name, c.result,
               c.votes, c.match_rule
        from core.candidacies c join core.politicians p on p.id = c.politician_id
        order by p.source_id, c.round
        """
    ).fetchall()
    assert rows == [
        ("tse-test-1", 2022, 1, "DEPUTADO FEDERAL", "MARIA TESTE", "ELEITO POR QP", 1234, "cpf"),
        ("tse-test-2", 2022, 1, "GOVERNADOR", "NOME DE URNA", "2º TURNO", 500,
         "nome-e-nascimento"),
        ("tse-test-2", 2022, 2, "GOVERNADOR", "NOME DE URNA", "NÃO ELEITO", 400,
         "nome-e-nascimento"),
    ]  # fmt: skip


def test_keeps_no_personal_data_from_the_tse_files(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path)
    leaks = clean.execute(
        """
        select count(*) from core.candidacies c
        where row_to_json(c)::text ~ '(email@exemplo|PARDA|FEMININO|99999999999|12345678901)'
        """
    ).fetchone()
    assert leaks == (0,)
    assert clean.execute(
        "select count(*) from core.candidacies where tse_candidate_id = '70003'"
    ).fetchone() == (0,)


def test_large_files_are_kept_on_disk_with_hash(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path)
    files = clean.execute(
        "select url, file_size, file_path from raw.responses where source = 'tse' order by url"
    ).fetchall()
    assert [(url.rsplit("/", 1)[-1], size) for url, size, _ in files] == [
        ("consulta_cand_2022.zip", len(CANDIDACIES)),
        ("votacao_candidato_munzona_2022.zip", len(VOTES)),
    ]
    assert all(Path(path).exists() for _, _, path in files)


def test_too_few_matches_in_a_recent_election_publishes_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    def make() -> TseSource:
        source = TseSource()  # needs 400 matches in 2022
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    queue.enqueue(clean, "tse", "candidacies", "2022", {"year": 2022})
    summary = runner.work(
        test_database_url, {"tse": make}, tmp_path, transport=httpx.MockTransport(handler)
    )
    assert summary.failed == 1
    assert clean.execute("select count(*) from core.candidacies").fetchone() == (0,)
