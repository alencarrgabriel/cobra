"""Senado adapter end to end with recorded responses (spec senadores)."""

import copy
import json
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import httpx
import psycopg
import pytest

from cobra_collectors import runner
from cobra_collectors.sources.senado import SenadoSource
from cobra_collectors.sources.senado_model import as_list

pytestmark = pytest.mark.db

FIXTURES = Path(__file__).parent.parent / "fixtures" / "senado"
CURRENT = {"6335", "4770", "5977", "6358"}
# Titular on temporary leave (LCS) in the recorded list of senators out of office.
LICENSED = "5976"
DF = {"6335", "4770", "5977"}


def load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def code(item: dict[str, Any]) -> str:
    return str(item["IdentificacaoParlamentar"]["CodigoParlamentar"])


class FakeSenado:
    """Serves the recorded responses by path, like the real API."""

    def __init__(self) -> None:
        self.current: list[dict[str, Any]] = as_list(
            load("lista-atual.json")["ListaParlamentarEmExercicio"]["Parlamentares"]["Parlamentar"]
        )
        self.off: list[dict[str, Any]] = as_list(
            load("afastados.json")["AfastamentoAtual"]["Parlamentares"]["Parlamentar"]
        )
        self.party_history: dict[str, dict[str, Any]] = {}
        self.fail_off = False

    def body(self, parts: list[str]) -> dict[str, Any] | None:
        if parts == ["senador", "lista", "atual"]:
            return {"ListaParlamentarEmExercicio": {"Parlamentares": {"Parlamentar": self.current}}}
        if parts == ["senador", "afastados"]:
            return {"AfastamentoAtual": {"Parlamentares": {"Parlamentar": self.off}}}
        if parts[0] == "senador" and len(parts) == 2:
            body: dict[str, Any] = load(f"senador-{parts[1]}.json")
            return body
        if parts[0] == "senador" and parts[2:] == ["filiacoes"]:
            history: dict[str, Any] = self.party_history.get(parts[1]) or load(
                f"filiacoes-{parts[1]}.json"
            )
            return history
        return None

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path.split("/dadosabertos/", 1)[1]
        parts = path.removesuffix(".json").split("/")
        body = self.body(parts)
        if not path.endswith(".json"):
            # The real API answers in XML without the suffix.
            response = httpx.Response(200, text="<xml/>", headers={"Content-Type": "text/xml"})
        elif self.fail_off and parts == ["senador", "afastados"]:
            response = httpx.Response(503)
        else:
            response = httpx.Response(200, json=body) if body is not None else httpx.Response(404)
        return response


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.mandates where source in ('senado', 'camara')",
            "delete from core.party_affiliations where source in ('senado', 'camara')",
            "delete from core.politician_external_ids where source in ('senado', 'camara')",
            "delete from core.politicians where source in ('senado', 'camara')",
            "delete from core.parties where source in ('senado', 'camara')",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def factory() -> Callable[[], SenadoSource]:
    def make() -> SenadoSource:
        source = SenadoSource(vote_years=())
        # The fake API needs no politeness; the real limit is checked below.
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    return make


def collect(
    db: psycopg.Connection, url: str, tmp_path: Path, fake: FakeSenado
) -> runner.RunSummary:
    runner.enqueue_source(db, factory()())
    return runner.work(url, {"senado": factory()}, tmp_path, transport=httpx.MockTransport(fake))


def in_office(db: psycopg.Connection, uf_code: str | None = None) -> set[str]:
    rows = db.execute(
        """
        select e.external_id from core.mandates m
        join core.legislative_houses h on h.id = m.house_id and h.slug = 'senado'
        join core.politician_external_ids e
          on e.politician_id = m.politician_id and e.system = 'senado'
        where m.office = 'senador' and m.ended_on is null
          and m.status in ('titular', 'suplente')
          and (%s::text is null or m.locality_code = %s)
        """,
        (uf_code, uf_code),
    ).fetchall()
    return {r[0] for r in rows}


def mandate_of(db: psycopg.Connection, senator: str) -> tuple[Any, ...] | None:
    return db.execute(
        """
        select m.status::text, m.started_on::text, m.ended_on::text, m.legislature
        from core.mandates m join core.politician_external_ids e
          on e.politician_id = m.politician_id and e.system = 'senado'
        where e.external_id = %s order by m.started_on desc limit 1
        """,
        (senator,),
    ).fetchone()


def counts(db: psycopg.Connection) -> tuple[int, ...]:
    row = db.execute(
        """
        select (select count(*) from core.politicians where source = 'senado'),
               (select count(*) from core.mandates where source = 'senado'),
               (select count(*) from core.party_affiliations where source = 'senado'),
               (select count(*) from core.parties where source = 'senado')
        """
    ).fetchone()
    assert row is not None
    return tuple(row)


def test_full_load(clean: psycopg.Connection, test_database_url: str, tmp_path: Path) -> None:
    summary = collect(clean, test_database_url, tmp_path, FakeSenado())
    assert summary.failed == 0
    assert summary.done == 1 + len(CURRENT) + 1
    assert in_office(clean) == CURRENT
    assert in_office(clean, "53") == DF
    assert mandate_of(clean, "6335") == ("titular", "2023-02-01", None, 57)
    assert mandate_of(clean, "4770") == ("titular", "2019-02-01", None, 56)
    assert mandate_of(clean, "6358") == ("suplente", "2026-10-06", None, 57)
    # The titular on leave holds the mandate, outside the current bench.
    licensed = mandate_of(clean, LICENSED)
    assert licensed is not None and licensed[0] == "licenciado" and licensed[2] is None
    name = clean.execute(
        "select p.civil_name, p.birth_date::text from core.politicians p "
        "join core.politician_external_ids e on e.politician_id = p.id "
        "where e.system = 'senado' and e.external_id = '6335'"
    ).fetchone()
    assert name == ("Damares Regina Alves", "1964-03-11")


def test_second_identical_run_adds_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeSenado()
    collect(clean, test_database_url, tmp_path, fake)
    first = counts(clean)
    collect(clean, test_database_url, tmp_path, fake)
    assert counts(clean) == first


def test_affiliations_keep_the_senate_dates(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, FakeSenado())
    rows = clean.execute(
        """
        select pa.acronym, a.started_on::text, a.ended_on::text from core.party_affiliations a
        join core.parties pa on pa.id = a.party_id
        join core.politician_external_ids e on e.politician_id = a.politician_id
        where e.system = 'senado' and e.external_id = '6358' order by a.started_on
        """
    ).fetchall()
    assert rows == [
        ("PSB", "2023-02-02", "2024-04-23"),
        ("PDT", "2024-04-24", "2026-03-03"),
        ("PSB", "2026-03-04", None),
    ]


def test_party_change_closes_the_open_affiliation(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeSenado()
    collect(clean, test_database_url, tmp_path, fake)
    history = copy.deepcopy(load("filiacoes-6358.json"))
    rows = history["FiliacaoParlamentar"]["Parlamentar"]["Filiacoes"]["Filiacao"]
    rows[0]["DataDesfiliacao"] = "2026-10-20"
    rows.insert(
        0,
        {
            "Partido": {"CodigoPartido": "20", "SiglaPartido": "PDT", "NomePartido": "PDT"},
            "DataFiliacao": "2026-10-21",
        },
    )
    fake.party_history["6358"] = history
    collect(clean, test_database_url, tmp_path, fake)
    open_rows = clean.execute(
        """
        select pa.acronym from core.party_affiliations a join core.parties pa on pa.id = a.party_id
        join core.politician_external_ids e on e.politician_id = a.politician_id
        where e.external_id = '6358' and e.system = 'senado' and a.ended_on is null
        """
    ).fetchall()
    assert open_rows == [("PDT",)]


def leaves_office(fake: FakeSenado, senator: str, off_entry: dict[str, Any]) -> None:
    fake.current = [i for i in fake.current if code(i) != senator]
    fake.off.append(off_entry)


def test_titular_on_leave_keeps_the_mandate(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeSenado()
    collect(clean, test_database_url, tmp_path, fake)
    entry = copy.deepcopy(next(i for i in fake.current if code(i) == "6335"))
    entry["Mandato"]["Exercicios"]["Exercicio"] = [
        {"DataInicio": "2023-02-01", "DataFim": "2026-10-20", "SiglaCausaAfastamento": "AFO"}
    ]
    leaves_office(fake, "6335", entry)
    collect(clean, test_database_url, tmp_path, fake)
    assert mandate_of(clean, "6335") == ("licenciado", "2023-02-01", None, 57)
    assert in_office(clean, "53") == DF - {"6335"}


def test_titular_who_resigns_has_the_mandate_ended(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeSenado()
    collect(clean, test_database_url, tmp_path, fake)
    entry = copy.deepcopy(next(i for i in fake.current if code(i) == "4770"))
    entry["Mandato"]["Exercicios"]["Exercicio"] = [
        {"DataInicio": "2019-02-01", "DataFim": "2026-10-15", "SiglaCausaAfastamento": "REN"}
    ]
    leaves_office(fake, "4770", entry)
    collect(clean, test_database_url, tmp_path, fake)
    assert mandate_of(clean, "4770") == ("titular", "2019-02-01", "2026-10-15", 56)
    assert counts(clean)[0] == len(CURRENT) + 1  # nothing deleted


def test_substitute_back_to_substitute_has_the_mandate_ended(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeSenado()
    collect(clean, test_database_url, tmp_path, fake)
    entry = copy.deepcopy(next(i for i in fake.current if code(i) == "6358"))
    for period in as_list(entry["Mandato"]["Exercicios"]["Exercicio"]):
        if "DataFim" not in period:
            period.update(DataFim="2026-10-25", SiglaCausaAfastamento="RET")
    leaves_office(fake, "6358", entry)
    collect(clean, test_database_url, tmp_path, fake)
    assert mandate_of(clean, "6358") == ("suplente", "2026-10-06", "2026-10-25", 57)


def test_unavailable_out_of_office_list_changes_no_mandate(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeSenado()
    collect(clean, test_database_url, tmp_path, fake)
    fake.current = [i for i in fake.current if code(i) != "6335"]
    fake.fail_off = True
    summary = collect(clean, test_database_url, tmp_path, fake)
    assert summary.failed == 1
    assert in_office(clean) == CURRENT


def test_former_deputy_is_linked_to_the_same_politician(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    # As if the Câmara had registered 6335 earlier (same civil name, other spelling).
    row = clean.execute(
        """
        insert into core.politicians (civil_name, parliamentary_name, birth_date, source,
          source_id, collected_at)
        values ('DAMARES REGINA ALVES', 'Damares Alves', '1964-03-11', 'camara', '999001', now())
        returning id
        """
    ).fetchone()
    assert row is not None
    clean.execute(
        """
        insert into core.politician_external_ids (politician_id, system, external_id, source,
          source_id, collected_at)
        values (%s, 'camara', '999001', 'camara', '999001', now())
        """,
        (row[0],),
    )
    collect(clean, test_database_url, tmp_path, FakeSenado())
    systems = clean.execute(
        "select system::text from core.politician_external_ids where politician_id = %s "
        "order by system",
        (row[0],),
    ).fetchall()
    assert systems == [("camara",), ("senado",)]
    assert counts(clean)[0] == len(CURRENT)  # one linked, one licensed added


def test_unknown_uf_blocks_only_that_senator(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeSenado()
    fake.current = copy.deepcopy(fake.current)
    next(i for i in fake.current if code(i) == "6335")["Mandato"]["UfParlamentar"] = "XX"
    summary = collect(clean, test_database_url, tmp_path, fake)
    assert summary.failed == 1
    assert in_office(clean) == CURRENT - {"6335"}
    error = clean.execute(
        "select last_error from ops.jobs where kind = 'senator' and dedupe_key = '6335'"
    ).fetchone()
    assert error is not None
    assert "UF 'XX' desconhecida" in error[0]


def test_rate_limit_stays_below_the_official_ten_per_second() -> None:
    source = SenadoSource(vote_years=())
    assert (source.rate_per_second, source.burst) == (8.0, 4)
