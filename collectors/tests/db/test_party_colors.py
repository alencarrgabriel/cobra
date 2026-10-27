"""Curated party colors (spec identidade-de-partidos-e-ufs)."""

import re

import psycopg
import pytest

pytestmark = pytest.mark.db


def test_every_color_has_format_basis_and_source(autocommit_conn: psycopg.Connection) -> None:
    rows = autocommit_conn.execute(
        "select acronym, color, basis, source::text, source_url, collected_at "
        "from core.party_colors"
    ).fetchall()
    assert len(rows) >= 20
    for acronym, color, basis, source, url, collected_at in rows:
        assert re.fullmatch(r"#[0-9a-f]{6}", color), acronym
        assert basis in {"theme_color", "site_css", "known_identity"}
        assert source == "cobra"
        assert url.startswith("https://")
        assert collected_at is not None


def test_psb_color_comes_from_its_official_site(autocommit_conn: psycopg.Connection) -> None:
    assert autocommit_conn.execute(
        "select color, basis, source_url from core.party_colors where acronym = 'PSB'"
    ).fetchone() == ("#c41d23", "theme_color", "https://psb40.org.br")


def test_invalid_color_is_rejected(autocommit_conn: psycopg.Connection) -> None:
    with pytest.raises(psycopg.errors.CheckViolation):
        autocommit_conn.execute(
            "insert into core.party_colors (acronym, color, basis, source_url, collected_at) "
            "values ('XX', 'red', 'site_css', 'https://x', now())"
        )
