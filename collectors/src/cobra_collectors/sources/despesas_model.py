"""Parliamentary quota expenses → Cobra: pure reading (no I/O besides a local file).

Câmara: https://www.camara.leg.br/cotas/Ano-<ano>.csv.zip. Senado:
https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/<ano>. Both checked
on 2026-10-27. See design D1 to D3 of openspec change `ingestao-despesas`.

A supplier with a CPF is a private person and only its kind and value are kept; passenger
names, trips and the member's own CPF are never read.
"""

import csv
import io
import zipfile
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

FIRST_YEAR = 2023
CPF_DIGITS = 11
CNPJ_DIGITS = 14


def camara_url(year: int) -> str:
    return f"https://www.camara.leg.br/cotas/Ano-{year}.csv.zip"


def senado_url(year: int) -> str:
    return f"https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{year}"


class UnreadableExpenseError(ValueError):
    """A value the reader does not understand: the file changed."""


@dataclass(frozen=True)
class Expense:
    source_id: str
    member_id: str
    year: int
    month: int
    category: str
    supplier_kind: str
    supplier_name: str | None
    supplier_cnpj: str | None
    issued_on: date | None
    value: Decimal
    document_url: str | None


def supplier(document: str | None, name: str | None) -> tuple[str, str | None, str | None]:
    """(kind, name, CNPJ): a CPF keeps neither name nor number (design D2)."""
    digits = "".join(c for c in (document or "") if c.isdigit())
    if len(digits) == CPF_DIGITS:
        return "pessoa_fisica", None, None
    clean_name = (name or "").strip() or None
    if len(digits) == CNPJ_DIGITS:
        return "empresa", clean_name, digits
    return "nao_informado", clean_name, None


def money(value: object) -> Decimal:
    if isinstance(value, int | float):
        return Decimal(str(value))
    text = str(value or "").strip()
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    try:
        return Decimal(text)
    except InvalidOperation as error:
        raise UnreadableExpenseError(f"valor ilegível: {value!r}") from error


def _date(text: object) -> date | None:
    try:
        return date.fromisoformat(str(text)[:10]) if text else None
    except ValueError:
        return None


CAMARA_COLUMNS = ("ideCadastro", "txtDescricao", "txtFornecedor", "txtCNPJCPF", "datEmissao",
                  "vlrLiquido", "numMes", "numAno", "ideDocumento", "urlDocumento")  # fmt: skip


def read_camara(archive: zipfile.ZipFile) -> Iterator[Expense]:
    """Expenses of deputies (rows with `ideCadastro`); leaderships are left out."""
    for name in archive.namelist():
        if not name.lower().endswith(".csv"):
            continue
        with archive.open(name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig"), delimiter=";")
            missing = set(CAMARA_COLUMNS) - set(reader.fieldnames or ())
            if missing:
                raise UnreadableExpenseError(f"{name}: faltam as colunas {sorted(missing)}")
            for row in reader:
                member = (row["ideCadastro"] or "").strip()
                if not member or not row["numMes"].strip().isdigit():
                    continue
                kind, supplier_name, cnpj = supplier(row["txtCNPJCPF"], row["txtFornecedor"])
                yield Expense(
                    source_id=f"camara-{row['ideDocumento'] or ''}-{member}",
                    member_id=member,
                    year=int(row["numAno"]),
                    month=int(row["numMes"]),
                    category=(row["txtDescricao"] or "").strip() or "Não informado",
                    supplier_kind=kind,
                    supplier_name=supplier_name,
                    supplier_cnpj=cnpj,
                    issued_on=_date(row["datEmissao"]),
                    value=money(row["vlrLiquido"]),
                    document_url=(row["urlDocumento"] or "").strip() or None,
                )


def read_senado(items: Iterable[dict[str, Any]]) -> Iterator[Expense]:
    for item in items:
        member = item.get("codSenador")
        month = item.get("mes")
        if not member or not isinstance(month, int):
            continue
        kind, supplier_name, cnpj = supplier(item.get("cpfCnpj"), item.get("fornecedor"))
        yield Expense(
            source_id=f"senado-{item.get('id')}",
            member_id=str(member),
            year=int(item["ano"]),
            month=month,
            category=str(item.get("tipoDespesa") or "").strip() or "Não informado",
            supplier_kind=kind,
            supplier_name=supplier_name,
            supplier_cnpj=cnpj,
            issued_on=_date(item.get("data")),
            value=money(item.get("valorReembolsado")),
            document_url=None,
        )
