"""Câmara adapter end to end with recorded responses (spec deputados-federais)."""

import copy
import json
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import httpx
import psycopg
import pytest

from cobra_collectors import runner
from cobra_collectors.sources.camara import CamaraSource

pytestmark = pytest.mark.db

FIXTURES = Path(__file__).parent.parent / "fixtures" / "camara"
DF_IDS = {"73579", "141533", "160575", "204372", "204374", "220532", "220533", "220534"}


def load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class FakeCamara:
    """Serves the recorded responses by path, like the real API (DF list in pages of 5)."""

    def __init__(self) -> None:
        self.listing: list[dict[str, Any]] = load("deputados-df.json")["dados"]
        self.details: dict[str, dict[str, Any]] = {}
        self.fail_list = False

    def detail(self, deputy_id: str) -> dict[str, Any]:
        if deputy_id not in self.details:
            self.details[deputy_id] = load(f"deputado-{deputy_id}.json")
        return self.details[deputy_id]

    def __call__(self, request: httpx.Request) -> httpx.Response:
        parts = request.url.path.split("/api/v2/", 1)[1].split("/")
        if parts == ["deputados"]:
            if self.fail_list:
                return httpx.Response(500)
            size, page = int(request.url.params["itens"]), int(request.url.params["pagina"])
            items = self.listing[(page - 1) * size : page * size]
            links = [{"rel": "self", "href": str(request.url)}]
            if page * size < len(self.listing):
                links.append({"rel": "next", "href": str(request.url)})
            return httpx.Response(200, json={"dados": items, "links": links})
        if parts[0] == "deputados" and len(parts) == 2:
            return httpx.Response(200, json=self.detail(parts[1]))
        if parts[0] == "deputados" and parts[2:] == ["historico"]:
            return httpx.Response(200, json=load(f"historico-{parts[1]}.json"))
        if parts[0] == "partidos":
            return httpx.Response(200, json=load(f"partido-{parts[1]}.json"))
        return httpx.Response(404)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.mandates where source = 'camara'",
            "delete from core.party_affiliations where source = 'camara'",
            "delete from restricted.politician_private_ids where source = 'camara'",
            "delete from core.politician_external_ids where source = 'camara'",
            "delete from core.politicians where source = 'camara'",
            "delete from core.parties where source = 'camara'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def factory() -> Callable[[], CamaraSource]:
    def make() -> CamaraSource:
        source = CamaraSource(uf="DF", page_size=5, vote_years=())
        # The fake API needs no politeness; the real limit is checked in test_rate_limit.
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    return make


def collect(
    db: psycopg.Connection, url: str, tmp_path: Path, fake: FakeCamara
) -> runner.RunSummary:
    runner.enqueue_source(db, factory()())
    return runner.work(url, {"camara": factory()}, tmp_path, transport=httpx.MockTransport(fake))


def counts(db: psycopg.Connection) -> tuple[int, ...]:
    row = db.execute(
        """
        select (select count(*) from core.politicians where source = 'camara'),
               (select count(*) from core.mandates where source = 'camara'),
               (select count(*) from core.party_affiliations where source = 'camara'),
               (select count(*) from core.parties where source = 'camara'),
               (select count(*) from core.politician_external_ids where source = 'camara')
        """
    ).fetchone()
    assert row is not None
    return tuple(row)


def df_in_office(db: psycopg.Connection) -> set[str]:
    rows = db.execute(
        """
        select e.external_id from core.mandates m
        join core.legislative_houses h on h.id = m.house_id and h.slug = 'camara'
        join core.politician_external_ids e
          on e.politician_id = m.politician_id and e.system = 'camara'
        where m.locality_code = '53' and m.office = 'deputado_federal'
          and m.ended_on is null and m.status in ('titular', 'suplente')
        """
    ).fetchall()
    return {r[0] for r in rows}


def test_full_load(clean: psycopg.Connection, test_database_url: str, tmp_path: Path) -> None:
    summary = collect(clean, test_database_url, tmp_path, FakeCamara())
    assert summary.failed == 0
    # 2 list pages + close-mandates + 8 deputies
    assert summary.done == 11
    assert df_in_office(clean) == DF_IDS
    politician = clean.execute(
        """
        select p.civil_name, p.parliamentary_name, p.birth_date::text, p.photo_url
        from core.politicians p join core.politician_external_ids e on e.politician_id = p.id
        where e.system = 'camara' and e.external_id = '73579'
        """
    ).fetchone()
    assert politician == (
        "JOÃO ALBERTO FRAGA SILVA",
        "Alberto Fraga",
        "1956-06-02",
        "https://www.camara.leg.br/internet/deputado/bandep/73579.jpg",
    )
    mandate = clean.execute(
        "select legislature, started_on::text, status from core.mandates "
        "where source_id = '73579-57-2023-02-01'"
    ).fetchone()
    assert mandate == (57, "2023-02-01", "titular")
    party = clean.execute(
        """
        select pa.acronym, pa.name from core.party_affiliations a
        join core.parties pa on pa.id = a.party_id
        join core.politician_external_ids e on e.politician_id = a.politician_id
        where e.external_id = '73579' and a.ended_on is null
        """
    ).fetchone()
    assert party == ("PL", "Partido Liberal")


def test_second_identical_run_adds_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCamara()
    collect(clean, test_database_url, tmp_path, fake)
    first = counts(clean)
    collect(clean, test_database_url, tmp_path, fake)
    assert counts(clean) == first
    assert first == (8, 8, 8, 6, 8)


def test_cpf_only_in_the_restricted_schema(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, FakeCamara())
    assert clean.execute(
        "select count(*) from restricted.politician_private_ids where source = 'camara'"
    ).fetchone() == (8,)
    cpf = clean.execute("select cpf from restricted.politician_private_ids limit 1").fetchone()
    assert cpf is not None
    hits = clean.execute(
        """
        select table_name, column_name from information_schema.columns
        where table_schema = 'core' and (column_name ilike '%%cpf%%')
        """
    ).fetchall()
    assert hits == []


def test_unknown_uf_blocks_only_that_deputy(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCamara()
    body = copy.deepcopy(fake.detail("73579"))
    body["dados"]["ultimoStatus"]["siglaUf"] = "XX"
    fake.details["73579"] = body
    summary = collect(clean, test_database_url, tmp_path, fake)
    assert summary.failed == 1
    assert df_in_office(clean) == DF_IDS - {"73579"}
    error = clean.execute(
        "select last_error from ops.jobs where kind = 'deputy' and dedupe_key = '73579'"
    ).fetchone()
    assert error is not None
    assert "UF 'XX' desconhecida" in error[0]


def open_mandate(db: psycopg.Connection, deputy_id: str) -> tuple[Any, ...] | None:
    return db.execute(
        """
        select m.status::text, m.ended_on::text from core.mandates m
        join core.politician_external_ids e
          on e.politician_id = m.politician_id and e.system = 'camara'
        where e.external_id = %s order by m.started_on desc limit 1
        """,
        (deputy_id,),
    ).fetchone()


def test_party_change_closes_the_old_affiliation(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCamara()
    collect(clean, test_database_url, tmp_path, fake)
    # 73579 moves from PL to PSB (Câmara party 36832) on 2026-10-20.
    body = copy.deepcopy(fake.detail("73579"))
    body["dados"]["ultimoStatus"].update(siglaPartido="PSB", data="2026-10-20")
    fake.details["73579"] = body
    item = next(i for i in fake.listing if i["id"] == 73579)
    item["uriPartido"] = "https://dadosabertos.camara.leg.br/api/v2/partidos/36832"
    collect(clean, test_database_url, tmp_path, fake)
    rows = clean.execute(
        """
        select pa.acronym, a.started_on::text, a.ended_on::text from core.party_affiliations a
        join core.parties pa on pa.id = a.party_id
        join core.politician_external_ids e on e.politician_id = a.politician_id
        where e.external_id = '73579' order by a.id
        """
    ).fetchall()
    assert rows == [("PL", None, "2026-10-20"), ("PSB", "2026-10-20", None)]


def leaves_the_list(fake: FakeCamara, deputy_id: str, **status: Any) -> None:
    fake.listing = [i for i in fake.listing if str(i["id"]) != deputy_id]
    body = copy.deepcopy(fake.detail(deputy_id))
    body["dados"]["ultimoStatus"].update(status)
    fake.details[deputy_id] = body


def test_titular_on_leave_keeps_the_mandate(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCamara()
    collect(clean, test_database_url, tmp_path, fake)
    leaves_the_list(fake, "204372", situacao="Licença", data="2026-10-22")
    collect(clean, test_database_url, tmp_path, fake)
    assert open_mandate(clean, "204372") == ("licenciado", None)
    assert df_in_office(clean) == DF_IDS - {"204372"}
    # Back in office: the same mandate is titular again.
    fake.listing = load("deputados-df.json")["dados"]
    fake.details["204372"] = load("deputado-204372.json")
    collect(clean, test_database_url, tmp_path, fake)
    assert open_mandate(clean, "204372") == ("titular", None)
    assert clean.execute(
        "select count(*) from core.mandates where source_id like '204372-%%'"
    ).fetchone() == (1,)


def test_deputy_who_leaves_office_has_the_mandate_ended(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCamara()
    collect(clean, test_database_url, tmp_path, fake)
    leaves_the_list(fake, "220532", situacao="Fim de Mandato", data="2026-10-15")
    collect(clean, test_database_url, tmp_path, fake)
    assert open_mandate(clean, "220532") == ("titular", "2026-10-15")
    assert df_in_office(clean) == DF_IDS - {"220532"}
    # Nothing is deleted.
    assert counts(clean)[0] == 8


def test_failed_listing_ends_no_mandate(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCamara()
    collect(clean, test_database_url, tmp_path, fake)
    fake.fail_list = True
    summary = collect(clean, test_database_url, tmp_path, fake)
    assert summary.failed >= 1
    assert df_in_office(clean) == DF_IDS


def test_rate_limit_is_two_per_second() -> None:
    source = CamaraSource()
    assert (source.rate_per_second, source.burst, source.page_size) == (2.0, 2, 100)
