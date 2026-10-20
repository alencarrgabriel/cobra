"""Localities and legislative houses (specs cadastro-de-representantes, rastreabilidade)."""

import psycopg
import pytest

pytestmark = pytest.mark.db


def test_federal_district(db: psycopg.Connection) -> None:
    row = db.execute(
        "select kind::text, uf_abbr, name from core.localities where ibge_code = '53'"
    ).fetchone()
    assert row == ("uf", "DF", "Distrito Federal")


def test_there_are_27_ufs(db: psycopg.Connection) -> None:
    assert db.execute("select count(*) from core.localities where kind = 'uf'").fetchone() == (27,)


def test_cldf_is_district_level_and_belongs_to_df(db: psycopg.Connection) -> None:
    row = db.execute(
        "select level::text, locality_code from core.legislative_houses where slug = 'cldf'"
    ).fetchone()
    assert row == ("district", "53")


def test_federal_houses(db: psycopg.Connection) -> None:
    rows = db.execute(
        "select slug from core.legislative_houses where level = 'federal' order by slug"
    ).fetchall()
    assert rows == [("camara",), ("senado",)]


def test_uf_provenance(db: psycopg.Connection) -> None:
    row = db.execute(
        "select source::text, collected_at is not null from core.localities where ibge_code = '35'"
    ).fetchone()
    assert row == ("ibge", True)


def test_unknown_source_is_rejected(db: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.InvalidTextRepresentation):
        db.execute(
            "insert into core.legislative_houses (slug, name, level, source, collected_at) "
            "values ('x', 'X', 'federal', 'wikipedia', now())"
        )


def test_municipality_code_must_start_with_its_uf(db: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        db.execute(
            "insert into core.localities (ibge_code, kind, name, uf_code, uf_abbr, source, "
            "collected_at) values ('3550308', 'municipality', 'São Paulo', '53', 'SP', 'ibge', "
            "now())"
        )
