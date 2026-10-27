"""Spec despesas-da-cota: supplier kinds and reading (pure)."""

import io
import zipfile
from decimal import Decimal

from cobra_collectors.sources.despesas_model import read_camara, read_senado, supplier
from tests.expense_files import camara_row, camara_zip, senado_item


def test_a_cpf_keeps_neither_name_nor_number() -> None:
    assert supplier("123.456.789-01", "JOAO DE TAL") == ("pessoa_fisica", None, None)
    assert supplier("12.345.678/0001-90", "POSTO X LTDA") == (
        "empresa", "POSTO X LTDA", "12345678000190",
    )  # fmt: skip
    assert supplier("085.324.290/001-1", "CAFE LTDA") == ("nao_informado", "CAFE LTDA", None)


def test_camara_deputies_only_without_passengers() -> None:
    data = camara_zip([
        camara_row("204501", "1", "COMBUSTÍVEIS E LUBRIFICANTES.", "POSTO X LTDA",
                   "12.345.678/0001-90", "300.5"),
        camara_row("204501", "2", "PASSAGEM AÉREA - RPA", "MARIA DE TAL", "123.456.789-01",
                   "-50", passenger="MARIA DE TAL"),
        camara_row("", "3", "MANUTENÇÃO DE ESCRITÓRIO", "CAFE LTDA", "08532429000131", "10"),
    ])  # fmt: skip
    rows = list(read_camara(zipfile.ZipFile(io.BytesIO(data))))
    assert [(r.member_id, r.supplier_kind, r.supplier_name, r.value) for r in rows] == [
        ("204501", "empresa", "POSTO X LTDA", Decimal("300.5")),
        ("204501", "pessoa_fisica", None, Decimal("-50")),
    ]
    assert "MARIA" not in repr(rows) and "BSB" not in repr(rows)


def test_senado_by_member_code() -> None:
    [row] = read_senado([senado_item(1, 5672, "POSTO Y LTDA", "13.179.247/0001-69", 7000)])
    assert (row.member_id, row.month, row.value, row.supplier_cnpj) == (
        "5672", 7, Decimal("7000"), "13179247000169",
    )  # fmt: skip
    assert "JOSE" not in repr(row)
