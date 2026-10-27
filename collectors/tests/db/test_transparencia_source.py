"""Portal da Transparência adapter end to end with recorded rows (spec emendas-parlamentares)."""

import io
import zipfile
from collections.abc import Iterator
from pathlib import Path

import httpx
import psycopg
import pytest

from cobra_collectors import runner
from cobra_collectors.sources.transparencia import TransparenciaSource

pytestmark = pytest.mark.db

CSV = (
    Path(__file__).parent.parent / "fixtures" / "transparencia" / "EmendasParlamentares.csv"
).read_bytes()


def zipped(csv: bytes) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("EmendasParlamentares.csv", csv)
    return buffer.getvalue()


def serve(body: bytes) -> httpx.MockTransport:
    return httpx.MockTransport(
        lambda request: httpx.Response(
            200, content=body, headers={"Content-Type": "application/x-zip-compressed"}
        )
    )


@pytest.fixture
def clean(autocommit_conn: psycopg.Connection) -> Iterator[psycopg.Connection]:
    def wipe() -> None:
        for sql in (
            "delete from raw.responses",
            "delete from ops.jobs",
            "delete from ops.runs",
            "delete from core.amendments where source = 'transparencia'",
            "delete from core.amendment_authors where source = 'transparencia'",
            "delete from core.mandates where source_id like 'teste-%'",
            "delete from core.politicians where source_id like 'teste-%'",
        ):
            autocommit_conn.execute(sql)

    wipe()
    yield autocommit_conn
    wipe()


def senator(db: psycopg.Connection, name: str, key: str) -> int:
    row = db.execute(
        "insert into core.politicians (civil_name, parliamentary_name, source, source_id, "
        "collected_at) values (%s, %s, 'senado', %s, now()) returning id",
        (name, name, f"teste-{key}"),
    ).fetchone()
    assert row is not None
    db.execute(
        """
        insert into core.mandates (politician_id, house_id, office, locality_code, started_on,
          status, source, source_id, collected_at)
        select %s, id, 'senador', '53', '2023-02-01', 'titular', 'senado', %s, now()
        from core.legislative_houses where slug = 'senado'
        """,
        (row[0], f"teste-{key}-m"),
    )
    return int(row[0])


def collect(db: psycopg.Connection, url: str, tmp_path: Path, body: bytes) -> runner.RunSummary:
    def make() -> TransparenciaSource:
        source = TransparenciaSource()
        source.rate_per_second, source.burst = 1000.0, 1000
        return source

    runner.enqueue_source(db, make())
    return runner.work(url, {"transparencia": make}, tmp_path, transport=serve(body))


def test_load_links_authors_and_keeps_bancadas_apart(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    damares = senator(clean, "Damares Alves", "damares")
    summary = collect(clean, test_database_url, tmp_path, zipped(CSV))
    assert summary.failed == 0
    authors: dict[str, tuple[str, int | None]] = {
        code: (kind, politician)
        for code, kind, politician in clean.execute(
            "select source_id, kind, politician_id from core.amendment_authors "
            "where source = 'transparencia'"
        ).fetchall()
    }
    assert authors["4268"] == ("individual", damares)
    assert authors["7108"] == ("bancada", None)
    amendment = clean.execute(
        "select a.year, a.committed::text, a.uf_code, au.name from core.amendments a "
        "join core.amendment_authors au on au.id = a.author_id where a.source_id = '202542680008'"
    ).fetchone()
    assert amendment == (2025, "1345860.98", "53", "DAMARES ALVES")
    assert clean.execute(
        "select count(*) from core.amendments where source_id like '2026389900%%'"
    ).fetchone() == (0,)


def test_second_identical_run_adds_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    collect(clean, test_database_url, tmp_path, zipped(CSV))
    first = clean.execute(
        "select (select count(*) from core.amendments), "
        "(select count(*) from core.amendment_authors)"
    ).fetchone()
    collect(clean, test_database_url, tmp_path, zipped(CSV))
    second = clean.execute(
        "select (select count(*) from core.amendments), "
        "(select count(*) from core.amendment_authors)"
    ).fetchone()
    assert first == second


def test_ambiguous_author_name_stays_unlinked(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    senator(clean, "Damares Alves", "d1")
    senator(clean, "Damares Alves", "d2")
    collect(clean, test_database_url, tmp_path, zipped(CSV))
    assert clean.execute(
        "select politician_id from core.amendment_authors where source_id = '4268'"
    ).fetchone() == (None,)


def test_file_without_df_amendments_publishes_nothing(
    clean: psycopg.Connection, test_database_url: str, tmp_path: Path
) -> None:
    header = CSV.split(b"\r\n", 1)[0] + b"\r\n"
    summary = collect(clean, test_database_url, tmp_path, zipped(header))
    assert summary.failed == 1
    assert clean.execute("select count(*) from core.amendments").fetchone() == (0,)
