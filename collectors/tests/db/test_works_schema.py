"""Works tables (specs obras-federais, rastreabilidade-de-dados, acesso-ao-banco)."""

import psycopg
import pytest

from .test_access import as_role, expect_denied

pytestmark = pytest.mark.db


def insert_work(db: psycopg.Connection, source_id: str = "30410.53-71") -> int:
    row = db.execute(
        "insert into core.works (name, status, uf_code, source, source_id, collected_at) "
        "values ('Obra de teste', 'completed', '53', 'obrasgov', %s, now()) returning id",
        (source_id,),
    ).fetchone()
    assert row is not None
    return int(row[0])


def test_obrasgov_is_a_known_source(db: psycopg.Connection) -> None:
    insert_work(db)


def test_brasilia_is_the_df_municipality(db: psycopg.Connection) -> None:
    row = db.execute(
        "select kind::text, uf_code, name from core.localities where ibge_code = '5300108'"
    ).fetchone()
    assert row == ("municipality", "53", "Brasília")


def test_repeated_status_event_is_rejected(db: psycopg.Connection) -> None:
    work = insert_work(db)
    sql = (
        "insert into core.work_status_events (work_id, status, occurred_on, justification, "
        "source, source_id, collected_at) values (%s, 'Paralisada', '2025-05-07', 'Motivo', "
        "'obrasgov', %s, now())"
    )
    db.execute(sql, (work, "1"))
    with pytest.raises(psycopg.errors.UniqueViolation), db.transaction():
        db.execute(sql, (work, "2"))


def test_progress_over_100_is_rejected(db: psycopg.Connection) -> None:
    work = insert_work(db)
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute(
            "insert into core.work_progress (work_id, percent, source, collected_at) "
            "values (%s, 140, 'obrasgov', now())",
            (work,),
        )


def test_site_reads_works_but_cannot_write(db: psycopg.Connection) -> None:
    insert_work(db)
    with as_role(db, "cobra_web_reader"):
        assert db.execute("select count(*) from core.works").fetchone() == (1,)
    expect_denied(db, "cobra_web_reader", "delete from core.works")
