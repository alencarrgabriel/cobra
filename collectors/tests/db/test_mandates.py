"""Party affiliations and mandates (spec cadastro-de-representantes)."""

import psycopg
import pytest

from .test_politicians import insert_party, insert_politician

pytestmark = pytest.mark.db


def affiliate(
    db: psycopg.Connection, politician: int, party: int, start: str, end: str | None
) -> None:
    db.execute(
        "insert into core.party_affiliations (politician_id, party_id, started_on, ended_on, "
        "source, collected_at) values (%s, %s, %s, %s, 'camara', now())",
        (politician, party, start, end),
    )


def add_mandate(
    db: psycopg.Connection,
    politician: int,
    start: str,
    end: str | None,
    *,
    locality: str = "53",
    source: str | None = "camara",
) -> None:
    db.execute(
        "insert into core.mandates (politician_id, house_id, office, locality_code, started_on, "
        "ended_on, status, source, collected_at) values (%s, "
        "(select id from core.legislative_houses where slug = 'camara'), 'deputado_federal', "
        "%s, %s, %s, 'titular', %s, now())",
        (politician, locality, start, end, source),
    )


def test_party_change_keeps_history_and_current(db: psycopg.Connection) -> None:
    politician = insert_politician(db)
    old, new = insert_party(db, "OLD"), insert_party(db, "NEW")
    affiliate(db, politician, old, "2018-04-01", "2022-03-31")
    affiliate(db, politician, new, "2022-04-01", None)
    rows = db.execute(
        "select p.acronym from core.party_affiliations a join core.parties p on p.id = a.party_id "
        "where a.politician_id = %s and a.ended_on is null",
        (politician,),
    ).fetchall()
    assert rows == [("NEW",)]
    count = db.execute(
        "select count(*) from core.party_affiliations where politician_id = %s", (politician,)
    ).fetchone()
    assert count == (2,)


def test_second_open_affiliation_is_rejected(db: psycopg.Connection) -> None:
    politician = insert_politician(db)
    affiliate(db, politician, insert_party(db, "A1"), "2020-01-01", None)
    with pytest.raises(psycopg.errors.UniqueViolation):
        affiliate(db, politician, insert_party(db, "A2"), "2021-01-01", None)


def test_affiliation_ending_before_start_is_rejected(db: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        affiliate(db, insert_politician(db), insert_party(db, "B"), "2022-01-01", "2021-01-01")


def test_federal_deputy_for_df_is_found_by_uf_and_house(db: psycopg.Connection) -> None:
    politician = insert_politician(db)
    add_mandate(db, politician, "2023-02-01", "2027-01-31")
    rows = db.execute(
        "select m.politician_id, m.office::text, m.status::text, m.started_on::text "
        "from core.mandates m join core.legislative_houses h on h.id = m.house_id "
        "where m.locality_code = '53' and h.slug = 'camara'"
    ).fetchall()
    assert rows == [(politician, "deputado_federal", "titular", "2023-02-01")]


def test_overlapping_mandates_are_rejected(db: psycopg.Connection) -> None:
    politician = insert_politician(db)
    add_mandate(db, politician, "2019-02-01", "2023-01-31")
    add_mandate(db, politician, "2023-02-01", None)  # consecutive terms are fine
    with pytest.raises(psycopg.errors.ExclusionViolation):
        add_mandate(db, politician, "2022-06-01", "2022-12-31")


def test_unknown_locality_is_rejected(db: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        add_mandate(db, insert_politician(db), "2023-02-01", None, locality="99")


def test_mandate_without_source_is_rejected(db: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.NotNullViolation):
        add_mandate(db, insert_politician(db), "2023-02-01", None, source=None)
