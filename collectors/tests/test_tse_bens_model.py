"""Spec patrimonio-declarado: categories and reading (pure)."""

import io
import zipfile
from decimal import Decimal

import pytest

from cobra_collectors.sources.tse_bens_model import Asset, category, parse_value, read_assets
from tests.tse_files import ASSET_HEADER, asset, tse_zip


def assets(rows: list[str], header: str = ASSET_HEADER) -> list[Asset]:
    data = tse_zip("bem_candidato_2022", header, {"DF": rows})
    return list(read_assets(zipfile.ZipFile(io.BytesIO(data))))


def test_categories_by_type_code() -> None:
    assert [category(c) for c in (11, 12, 21, 23, 45, 63, 72, 31, 51, 99, None)] == [
        "imoveis", "imoveis", "veiculos", "veiculos", "dinheiro", "dinheiro", "dinheiro",
        "outros", "outros", "outros", "outros",
    ]  # fmt: skip


def test_values_with_decimal_comma() -> None:
    assert parse_value("30000,00") == Decimal("30000.00")
    assert parse_value("1.234,56") == Decimal("1234.56")
    assert parse_value("-113,14") == Decimal("-113.14")  # kept as the TSE informs
    with pytest.raises(ValueError):
        parse_value("abc")


def test_reads_type_and_value_but_never_the_description() -> None:
    [a] = assets([asset(year=2022, sq="70001", order=1, code="12", value="450000,00",
                        label="Casa mal codificada")])  # fmt: skip
    assert (a.year, a.tse_id, a.order, a.type_code, a.type_label, a.category, a.value) == (
        2022, "70001", 1, 12, "Casa", "imoveis", Decimal("450000.00"),
    )  # fmt: skip
    assert "QL 14" not in repr(a)
    assert a.source_id == "2022-70001-1"


def test_2006_order_column_and_code_99() -> None:
    header = ASSET_HEADER.replace("NR_ORDEM_BEM_CANDIDATO", "NR_ORDEM_CANDIDATO")
    [a] = assets([asset(year=2006, sq="10647", order=1, code="99", value="30000,00",
                        kind="0")], header)  # fmt: skip
    assert (a.year, a.type_label, a.category) == (2006, "Outros bens e direitos", "outros")
