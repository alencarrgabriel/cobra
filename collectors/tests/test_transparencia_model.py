"""Amendments file reading with real recorded rows (spec emendas-parlamentares)."""

from datetime import date
from decimal import Decimal
from pathlib import Path

from cobra_collectors.sources.transparencia_model import (
    author_kind,
    brl,
    read_df,
    recognize_code,
    rows,
)

CSV = (
    Path(__file__).parent / "fixtures" / "transparencia" / "EmendasParlamentares.csv"
).read_bytes()


def test_only_df_amendments_with_a_code_are_read() -> None:
    reading = read_df(rows(CSV))
    codes = set(reading.amendments)
    assert "202542680008" in codes  # Damares Alves, DF
    assert "202371080013" in codes  # Bancada do DF
    assert not any(c.startswith("2026389900") for c in codes)  # São Paulo
    assert reading.without_code >= 1
    assert reading.unknown_types == set()


def test_amendments_cited_by_df_works_are_kept_whatever_their_destination() -> None:
    reading = read_df(rows(CSV), frozenset({"202638990005"}))
    amendment = reading.amendments["202638990005"]
    assert amendment.locality == "SÃO PAULO (UF)"
    assert amendment.uf_code == "35"
    assert reading.amendments["202542680008"].uf_code == "53"


def test_values_are_summed_per_code() -> None:
    amendment = read_df(rows(CSV)).amendments["202542680008"]
    assert amendment.year == 2025
    assert amendment.number == "0008"
    assert amendment.author_code == "4268"
    assert amendment.author_name == "DAMARES ALVES"
    assert amendment.committed == Decimal("1345860.98")
    assert amendment.main_function is not None


def test_brasilia_rows_count_as_df() -> None:
    amendment = read_df(rows(CSV)).amendments["201528280008"]
    assert amendment.municipality_code == "5300108"
    assert amendment.locality == "BRASÍLIA - DF"


def test_author_kinds() -> None:
    assert author_kind("Emenda Individual - Transferências com Finalidade Definida") == "individual"
    assert author_kind("Emenda de Bancada") == "bancada"
    assert author_kind("Emenda de Comissão") == "comissao"
    assert author_kind("Emenda de Relator") == "relator"
    assert author_kind("Outra coisa") is None


def test_brl() -> None:
    assert brl("250000,00") == Decimal("250000.00")
    assert brl("1.345.860,98") == Decimal("1345860.98")
    assert brl("") == 0


def test_recognize_the_amendment_in_a_commitment() -> None:
    assert recognize_code("202542680008", None, None) == "202542680008"
    # Author and number: the year comes from the issue date or the commitment number.
    assert recognize_code("71080013", date(2026, 3, 1), "2026NE000001") == "202671080013"
    assert recognize_code("71080013", None, "2023NE000117") == "202371080013"
    # A code that lost a digit as a decimal number cannot be rebuilt safely.
    assert recognize_code("20264268000.0", None, "2026NE000001") is None
    assert recognize_code("1aaelz", None, None) is None
    assert recognize_code("0", None, None) is None
    assert recognize_code(None, None, None) is None
