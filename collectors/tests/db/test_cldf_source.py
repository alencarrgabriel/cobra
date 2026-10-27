"""CLDF adapter end to end with recorded pages (spec deputados-distritais)."""

from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

import httpx
import psycopg
import pytest

from cobra_collectors import runner
from cobra_collectors.sources.cldf import CldfSource
from cobra_collectors.sources.cldf_model import parse_list

pytestmark = pytest.mark.db

FIXTURES = Path(__file__).parent.parent / "fixtures" / "cldf"
LIST = (FIXTURES / "deputados-2023-2026.html").read_text(encoding="utf-8")
TEMPLATE = (FIXTURES / "perfil-chico-vigilante-2019-2022.html").read_text(encoding="utf-8")
ALL = {d.source_id for d in parse_list(LIST)}


class FakeCldf:
    """Serves the recorded list and profiles; other profiles come from a recorded template."""

    def __init__(self) -> None:
        self.list_page = LIST
        self.removed: set[str] = set()

    def profile(self, slug: str) -> str:
        recorded = FIXTURES / f"perfil-{slug}.html"
        if recorded.exists():
            return recorded.read_text(encoding="utf-8")
        card = next(d for d in parse_list(LIST) if d.source_id == slug)
        day = 1 + len(slug) % 27
        return (
            TEMPLATE.replace("Francisco Domingos dos Santos", f"Nome Civil de {card.name}")
            .replace("08/09/1954", f"{day:02d}/05/1970")
            .replace("Partido dos Trabalhadores (PT)", card.party_text)
        )

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/deputados-2023-2026":
            page = self.list_page
            for slug in self.removed:
                page = page.replace(f'/{slug}"', '/removido"', 1)
            return httpx.Response(200, text=page)
        slug = path.rstrip("/").rsplit("/", 1)[-1]
        if slug in ALL:
            return httpx.Response(200, text=self.profile(slug))
        return httpx.Response(404)


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.mandates where source in ('cldf', 'camara')",
            "delete from core.party_affiliations where source in ('cldf', 'camara')",
            "delete from core.politician_external_ids where source in ('cldf', 'camara')",
            "delete from core.politicians where source in ('cldf', 'camara')",
            "delete from core.parties where source in ('cldf', 'camara')",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def factory() -> Callable[[], CldfSource]:
    def make() -> CldfSource:
        source = CldfSource()
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    return make


def collect(db: psycopg.Connection, url: str, tmp_path: Path, fake: FakeCldf) -> runner.RunSummary:
    runner.enqueue_source(db, factory()())
    return runner.work(url, {"cldf": factory()}, tmp_path, transport=httpx.MockTransport(fake))


def open_mandates(db: psycopg.Connection) -> set[str]:
    rows = db.execute(
        """
        select e.external_id from core.mandates m
        join core.legislative_houses h on h.id = m.house_id and h.slug = 'cldf'
        join core.politician_external_ids e
          on e.politician_id = m.politician_id and e.system = 'cldf'
        where m.locality_code = '53' and m.office = 'deputado_distrital' and m.ended_on is null
        """
    ).fetchall()
    return {r[0] for r in rows}


def party_of(db: psycopg.Connection, slug: str) -> Any:
    row = db.execute(
        """
        select pa.acronym from core.party_affiliations a join core.parties pa on pa.id = a.party_id
        join core.politician_external_ids e on e.politician_id = a.politician_id
        where e.system = 'cldf' and e.external_id = %s and a.ended_on is null
        """,
        (slug,),
    ).fetchone()
    return row[0] if row else None


def counts(db: psycopg.Connection) -> tuple[int, ...]:
    row = db.execute(
        """
        select (select count(*) from core.politicians where source = 'cldf'),
               (select count(*) from core.mandates where source = 'cldf'),
               (select count(*) from core.party_affiliations where source = 'cldf')
        """
    ).fetchone()
    assert row is not None
    return tuple(row)


def test_full_load(clean: psycopg.Connection, test_database_url: str, tmp_path: Path) -> None:
    summary = collect(clean, test_database_url, tmp_path, FakeCldf())
    assert summary.failed == 0
    assert summary.done == 25
    assert open_mandates(clean) == ALL
    chico = clean.execute(
        """
        select p.civil_name, p.parliamentary_name, p.birth_date::text, m.started_on::text,
               m.status::text, m.legislature
        from core.politicians p
        join core.politician_external_ids e on e.politician_id = p.id and e.system = 'cldf'
        join core.mandates m on m.politician_id = p.id
        where e.external_id = 'chico-vigilante-2019-2022'
        """
    ).fetchone()
    assert chico == (
        "Francisco Domingos dos Santos",
        "Chico Vigilante",
        "1954-09-08",
        "2023-01-01",
        "titular",
        2023,
    )
    assert party_of(clean, "chico-vigilante-2019-2022") == "PT"
    assert party_of(clean, "doutora-jane") == "REPUBLICANOS"
    assert party_of(clean, "roberio-negreiros-2019-2022") == "PODE"


def test_extinct_party_leaves_no_current_affiliation(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, FakeCldf())
    assert party_of(clean, "jorge-vianna-2019-2022") is None
    assert "jorge-vianna-2019-2022" in open_mandates(clean)


def test_second_identical_run_adds_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCldf()
    collect(clean, test_database_url, tmp_path, fake)
    first = counts(clean)
    collect(clean, test_database_url, tmp_path, fake)
    assert counts(clean) == first
    assert first == (24, 24, 23)


def test_page_that_changed_shape_changes_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCldf()
    collect(clean, test_database_url, tmp_path, fake)
    fake.list_page = "<html><body>Em manutenção</body></html>"
    summary = collect(clean, test_database_url, tmp_path, fake)
    assert summary.failed == 1
    assert open_mandates(clean) == ALL
    error = clean.execute(
        "select last_error from ops.jobs where kind = 'list' and status <> 'done'"
    ).fetchone()
    assert error is not None
    assert "mínimo 20" in error[0]


def test_deputy_who_leaves_the_list_has_the_mandate_ended(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    fake = FakeCldf()
    collect(clean, test_database_url, tmp_path, fake)
    fake.removed = {"pepa"}
    collect(clean, test_database_url, tmp_path, fake)
    assert open_mandates(clean) == ALL - {"pepa"}
    assert counts(clean)[0] == 24


def test_former_federal_deputy_is_linked_to_the_same_politician(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    row = clean.execute(
        """
        insert into core.politicians (civil_name, parliamentary_name, birth_date, source,
          source_id, collected_at)
        values ('FRANCISCO DOMINGOS DOS SANTOS', 'Chico', '1954-09-08', 'camara', '999002', now())
        returning id
        """
    ).fetchone()
    assert row is not None
    clean.execute(
        "insert into core.politician_external_ids (politician_id, system, external_id, source, "
        "source_id, collected_at) values (%s, 'camara', '999002', 'camara', '999002', now())",
        (row[0],),
    )
    collect(clean, test_database_url, tmp_path, FakeCldf())
    systems = clean.execute(
        "select system::text from core.politician_external_ids where politician_id = %s "
        "order by system",
        (row[0],),
    ).fetchall()
    assert systems == [("camara",), ("cldf",)]
    assert counts(clean)[0] == 23


def test_rate_limit_is_one_page_per_second() -> None:
    source = CldfSource()
    assert (source.rate_per_second, source.burst) == (1.0, 1)
