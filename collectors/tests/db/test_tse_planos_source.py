"""TSE government plans adapter end to end (spec planos-de-governo)."""

import hashlib
import io
import zipfile
from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors import runner
from cobra_collectors.sources.tse_planos import TsePlanosSource
from tests.pdf_maker import make_pdf

pytestmark = pytest.mark.db

FIXTURES = Path(__file__).parent.parent / "fixtures" / "tse"
GOVERNOR_PDF = make_pdf(
    [
        "Plano de governo. Vamos ampliar hospitais e UBS em todas as regioes. Saude perto.",
        "Educacao: novas escolas, creche em cada bairro e professores valorizados.",
        "",
    ]
)
PRESIDENT_PDF = make_pdf(["Emprego e renda: economia que cresce com investimento e industria."])
OTHER_PDF = make_pdf(["Plano de outro candidato, nao eleito."])


def zipped(files: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        for name, data in files.items():
            archive.writestr(name, data)
    return buffer.getvalue()


CANDIDATES = zipped(
    {
        "consulta_cand_2022_DF.csv": (FIXTURES / "consulta_cand_2022_DF.csv").read_bytes(),
        "consulta_cand_2022_BR.csv": (FIXTURES / "consulta_cand_2022_BR.csv").read_bytes(),
    }
)
PLANS = {
    "proposta_governo_2022_DF.zip": zipped(
        {
            "DF/2022DF70001651044.pdf": GOVERNOR_PDF,
            "DF/2022DF70001651176.pdf": OTHER_PDF,
            "DF/leiame.pdf": OTHER_PDF,
        }
    ),
    "proposta_governo_2022_BR.zip": zipped({"BR/2022BR280001607829.pdf": PRESIDENT_PDF}),
}


def handler(request: httpx.Request) -> httpx.Response:
    name = request.url.path.rsplit("/", 1)[-1]
    if name == "consulta_cand_2022.zip":
        return httpx.Response(200, content=CANDIDATES)
    if name in PLANS:
        return httpx.Response(200, content=PLANS[name])
    return httpx.Response(404)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.government_plans",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def collect(db: psycopg.Connection, url: str, tmp_path: Path) -> runner.RunSummary:
    def make() -> TsePlanosSource:
        source = TsePlanosSource()
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    runner.enqueue_source(db, make())
    return runner.work(url, {"tse": make}, tmp_path, transport=httpx.MockTransport(handler))


def test_plans_of_the_elected_tickets(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    summary = collect(clean, test_database_url, tmp_path)
    assert summary.failed == 0
    rows = clean.execute(
        "select office, uf_code, holder_name, running_mate_name, party, tse_candidate_id, "
        "pdf_pages, pdf_sha256 from core.government_plans order by office"
    ).fetchall()
    assert rows == [
        (
            "governador", "53", "IBANEIS ROCHA", "CELINA LEÃO", "MDB", "70001651044", 3,
            hashlib.sha256(GOVERNOR_PDF).hexdigest(),
        ),
        (
            "presidente", None, "LULA", "GERALDO ALCKMIN", "PT", "280001607829", 1,
            hashlib.sha256(PRESIDENT_PDF).hexdigest(),
        ),
    ]  # fmt: skip
    stored = clean.execute(
        "select pdf from core.government_plans where office = 'governador'"
    ).fetchone()
    assert stored is not None and bytes(stored[0]) == GOVERNOR_PDF


def test_pages_themes_and_portuguese_search(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path)
    pages = clean.execute(
        """
        select p.page, p.has_text, coalesce(array_agg(t.theme order by t.theme)
               filter (where t.theme is not null), '{}')
        from core.government_plan_pages p join core.government_plans g on g.id = p.plan_id
        left join core.plan_page_themes t on t.plan_id = p.plan_id and t.page = p.page
        where g.office = 'governador' group by p.page, p.has_text order by p.page
        """
    ).fetchall()
    assert pages == [(1, True, ["saude"]), (2, True, ["educacao"]), (3, False, [])]
    # "escola" finds the page that says "escolas".
    found = clean.execute(
        "select page from core.government_plan_pages "
        "where search @@ plainto_tsquery('portuguese', 'escola')"
    ).fetchall()
    assert found == [(2,)]


def test_second_identical_run_adds_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path)
    query = (
        "select (select count(*) from core.government_plans), "
        "(select count(*) from core.government_plan_pages), "
        "(select count(*) from core.plan_page_themes)"
    )
    first = clean.execute(query).fetchone()
    collect(clean, test_database_url, tmp_path)
    assert clean.execute(query).fetchone() == first


def test_no_personal_data_from_the_candidates_file(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path)
    columns = clean.execute(
        """
        select column_name from information_schema.columns
        where table_schema = 'core' and table_name like 'government_plan%%'
          and column_name ~ '(cpf|email|titulo)'
        """
    ).fetchall()
    assert columns == []
    assert clean.execute(
        "select count(*) from core.government_plans where tse_candidate_id = '70001651176'"
    ).fetchone() == (0,)  # not elected
