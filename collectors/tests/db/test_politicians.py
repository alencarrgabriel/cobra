"""Parties, politicians and cross-source identity (spec cadastro-de-representantes)."""

import psycopg
import pytest

pytestmark = pytest.mark.db


def insert_party(db: psycopg.Connection, acronym: str, number: int | None = None) -> int:
    row = db.execute(
        "insert into core.parties (acronym, name, electoral_number, source, source_id, "
        "collected_at) values (%s, %s, %s, 'tse', %s, now()) returning id",
        (acronym, f"Partido {acronym}", number, acronym),
    ).fetchone()
    assert row is not None
    return int(row[0])


def insert_politician(db: psycopg.Connection, name: str = "Maria Silva") -> int:
    row = db.execute(
        "insert into core.politicians (civil_name, parliamentary_name, source, collected_at) "
        "values (%s, %s, 'camara', now()) returning id",
        (name, name),
    ).fetchone()
    assert row is not None
    return int(row[0])


def link(db: psycopg.Connection, politician_id: int, system: str, external_id: str) -> None:
    db.execute(
        "insert into core.politician_external_ids (politician_id, system, external_id, source, "
        "collected_at) values (%s, %s, %s, %s, now())",
        (politician_id, system, external_id, system),
    )


def test_repeated_acronym_is_rejected(db: psycopg.Connection) -> None:
    insert_party(db, "ABC")
    with pytest.raises(psycopg.errors.UniqueViolation):
        db.execute(
            "insert into core.parties (acronym, name, source, collected_at) "
            "values ('ABC', 'Outro', 'cobra', now())"
        )


def test_repeated_electoral_number_is_accepted(db: psycopg.Connection) -> None:
    insert_party(db, "OLD", 25)
    insert_party(db, "NEW", 25)


def test_same_politician_found_by_camara_and_tse_ids(db: psycopg.Connection) -> None:
    politician = insert_politician(db)
    link(db, politician, "camara", "204554")
    link(db, politician, "tse", "70001234567")
    rows = db.execute(
        "select distinct politician_id from core.politician_external_ids "
        "where (system, external_id) in (('camara', '204554'), ('tse', '70001234567'))"
    ).fetchall()
    assert rows == [(politician,)]


def test_external_id_cannot_point_to_two_politicians(db: psycopg.Connection) -> None:
    link(db, insert_politician(db, "A"), "camara", "1")
    with pytest.raises(psycopg.errors.UniqueViolation):
        link(db, insert_politician(db, "B"), "camara", "1")


def test_politician_without_collected_at_is_rejected(db: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.NotNullViolation):
        db.execute(
            "insert into core.politicians (civil_name, parliamentary_name, source) "
            "values ('A', 'A', 'camara')"
        )


def test_recollection_updates_instead_of_duplicating(db: psycopg.Connection) -> None:
    party_id = insert_party(db, "XYZ")
    with pytest.raises(psycopg.errors.UniqueViolation), db.transaction():
        db.execute(
            "insert into core.parties (acronym, name, source, source_id, collected_at) "
            "values ('XYZ2', 'Duplicado', 'tse', 'XYZ', now())"
        )
    row = db.execute(
        "insert into core.parties (acronym, name, source, source_id, collected_at) "
        "values ('XYZ', 'Nome novo', 'tse', 'XYZ', now()) "
        "on conflict (source, source_id) do update set name = excluded.name, "
        "collected_at = excluded.collected_at returning id, name"
    ).fetchone()
    assert row == (party_id, "Nome novo")


def test_cpf_must_be_eleven_digits(db: psycopg.Connection) -> None:
    politician = insert_politician(db)
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute(
            "insert into restricted.politician_private_ids (politician_id, cpf, source, "
            "collected_at) values (%s, '123.456.789-0', 'camara', now())",
            (politician,),
        )
