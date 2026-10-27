"""Portal da Transparência amendments file → Cobra: pure reading (no I/O).

File checked on 2026-10-26: EmendasParlamentares.zip (download em massa, sem chave).
See design D1 to D4 of openspec change `ingestao-emendas`.
"""

import csv
import io
import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, InvalidOperation

DOWNLOAD_URL = (
    "https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/"
    "emendas-parlamentares/EmendasParlamentares.zip"
)
PAGE_URL = "https://portaldatransparencia.gov.br/emendas"
MAIN_FILE = "EmendasParlamentares.csv"
DF_UF = "53"
BRASILIA = "5300108"
CODE = re.compile(r"^\d{12}$")

KINDS = {
    "Emenda de Bancada": "bancada",
    "Emenda de Comissão": "comissao",
    "Emenda de Relator": "relator",
}


def author_kind(amendment_type: str) -> str | None:
    if amendment_type.startswith("Emenda Individual"):
        return "individual"
    return KINDS.get(amendment_type)


def brl(value: str) -> Decimal:
    """`250000,00` or `1.345.860,98` → Decimal."""
    text = (value or "").strip().replace(".", "").replace(",", ".")
    try:
        return Decimal(text) if text else Decimal(0)
    except InvalidOperation:
        return Decimal(0)


def rows(data: bytes) -> Iterator[dict[str, str]]:
    """Rows of the main CSV (Latin-1, `;`), read line by line."""
    text = io.TextIOWrapper(io.BytesIO(data), encoding="latin1", newline="")
    yield from csv.DictReader(text, delimiter=";")


def is_df(row: dict[str, str]) -> bool:
    uf = (row.get("Código UF IBGE") or "").strip()
    return uf[:2] == DF_UF or (row.get("Código Município IBGE") or "").strip() == BRASILIA


@dataclass
class Amendment:
    code: str
    year: int
    number: str
    type: str
    author_code: str
    author_name: str
    locality: str
    municipality_code: str | None
    uf_code: str | None = None
    functions: list[str] = field(default_factory=list)
    main_function: str | None = None
    committed: Decimal = Decimal(0)
    liquidated: Decimal = Decimal(0)
    paid: Decimal = Decimal(0)
    rp_paid: Decimal = Decimal(0)
    _main_value: Decimal = Decimal(-1)

    def add(self, row: dict[str, str]) -> None:
        committed = brl(row.get("Valor Empenhado", ""))
        self.committed += committed
        self.liquidated += brl(row.get("Valor Liquidado", ""))
        self.paid += brl(row.get("Valor Pago", ""))
        self.rp_paid += brl(row.get("Valor Restos A Pagar Pagos", ""))
        function = (row.get("Nome Função") or "").strip()
        if function and function not in self.functions:
            self.functions.append(function)
        if function and committed > self._main_value:
            self.main_function, self._main_value = function, committed


@dataclass
class Reading:
    amendments: dict[str, Amendment]
    without_code: int = 0
    unknown_types: set[str] = field(default_factory=set)


def _uf_code(row: dict[str, str]) -> str | None:
    """IBGE state code ("5300000" → "53"); None for national or multiple destinations."""
    code = (row.get("Código UF IBGE") or "").strip()
    return code[:2] if len(code) >= 2 and code[:2].isdigit() and code[:2] != "00" else None  # noqa: PLR2004


def read_df(source_rows: Iterable[dict[str, str]], cited: frozenset[str] = frozenset()) -> Reading:
    """Amendments to the DF, plus those cited by commitments of DF works whatever their
    destination (national, multiple…), one per code, with values summed (design D2)."""
    reading = Reading(amendments={})
    for row in source_rows:
        code = (row.get("Código da Emenda") or "").strip()
        if not (is_df(row) or code in cited):
            continue
        if not CODE.match(code):
            reading.without_code += 1
            continue
        amendment_type = (row.get("Tipo de Emenda") or "").strip()
        if author_kind(amendment_type) is None:
            reading.unknown_types.add(amendment_type)
            continue
        amendment = reading.amendments.get(code)
        if amendment is None:
            municipality = (row.get("Código Município IBGE") or "").strip()
            amendment = Amendment(
                code=code,
                year=int(code[:4]),
                number=code[8:],
                type=amendment_type,
                author_code=(row.get("Código do Autor da Emenda") or code[4:8]).strip(),
                author_name=(row.get("Nome do Autor da Emenda") or "").strip(),
                locality=(row.get("Localidade de aplicação do recurso") or "").strip(),
                municipality_code=municipality if municipality == BRASILIA else None,
                uf_code=DF_UF if is_df(row) else _uf_code(row),
            )
            reading.amendments[code] = amendment
        amendment.add(row)
    return reading


def recognize_code(raw: str | None, issued_on: date | None, commitment: str | None) -> str | None:
    """12-digit amendment code from Obrasgov's `codigo_autor_emenda` (design D4).

    12 digits: the code. 8 digits: author and number, with the commitment's year. Anything
    else ("0", letters, or a code that lost a digit as a decimal number) is not recognised.
    """
    text = (raw or "").strip()
    if text.endswith(".0"):
        text = text[:-2]
    if not text.isdigit():
        return None
    if len(text) == 12:  # noqa: PLR2004 - year, author, number
        return text
    if len(text) == 8:  # noqa: PLR2004 - author, number
        year = issued_on.year if issued_on else None
        if year is None and commitment and commitment[:4].isdigit():
            year = int(commitment[:4])
        return f"{year}{text}" if year else None
    return None
