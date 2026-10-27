"""TSE declared assets → Cobra: pure reading (no I/O).

bem_candidato_<ano>.zip on cdn.tse.jus.br, checked on 2026-10-27: there from 2006 to 2024, one
latin-1 `;` CSV per UF. See design D1 to D3 of openspec change `ingestao-tse-patrimonio`.
The description of each asset (DS_BEM_CANDIDATO) is never read: it carries addresses.
"""

import csv
import io
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from cobra_collectors.sources.tse_candidaturas_model import MissingColumnsError, clean, is_ordinary
from cobra_collectors.sources.tse_planos_model import CDN

ASSET_YEARS = tuple(range(2006, 2025, 2))

COLUMNS = ("ANO_ELEICAO", "CD_TIPO_ELEICAO", "NM_TIPO_ELEICAO", "SQ_CANDIDATO",
           "CD_TIPO_BEM_CANDIDATO", "DS_TIPO_BEM_CANDIDATO", "VR_BEM_CANDIDATO")  # fmt: skip
# The order of the asset changed name after 2006.
ORDER_COLUMNS = ("NR_ORDEM_BEM_CANDIDATO", "NR_ORDEM_CANDIDATO")

# Type of asset as in the Receita Federal declaration used by the TSE (codes seen in 2020 and
# 2022), written correctly: the names in the files come with mixed encodings.
TYPES: dict[int, str] = {
    1: "Prédio residencial", 2: "Prédio comercial", 3: "Galpão", 11: "Apartamento",
    12: "Casa", 13: "Terreno", 14: "Terra nua", 15: "Sala ou conjunto", 16: "Construção",
    17: "Benfeitorias", 18: "Loja", 19: "Outros bens imóveis",
    21: "Veículo automotor terrestre", 22: "Aeronave", 23: "Embarcação",
    24: "Bem relacionado com o exercício da atividade autônoma",
    25: "Joia, quadro, objeto de arte, de coleção ou antiguidade", 26: "Linha telefônica",
    29: "Outros bens móveis", 31: "Ações", 32: "Quotas ou quinhões de capital",
    39: "Outras participações societárias", 41: "Caderneta de poupança",
    45: "Aplicação de renda fixa", 46: "Ouro, ativo financeiro",
    47: "Mercados futuros, de opções e a termo", 49: "Outras aplicações e investimentos",
    51: "Crédito decorrente de empréstimo", 52: "Crédito decorrente de alienação",
    53: "Plano PAIT e caderneta de pecúlio",
    54: "Poupança para construção ou aquisição de bem imóvel",
    59: "Outros créditos e poupança vinculados",
    61: "Depósito bancário em conta corrente no país",
    62: "Depósito bancário em conta corrente no exterior",
    63: "Dinheiro em espécie, moeda nacional", 64: "Dinheiro em espécie, moeda estrangeira",
    69: "Outros depósitos à vista e numerário", 71: "Fundo de curto prazo",
    72: "Fundo de longo prazo", 73: "Fundo de investimento imobiliário", 74: "Fundos de ações",
    79: "Outros fundos", 91: "Licenças e concessões especiais",
    92: "Título de clube e assemelhado", 93: "Direito de autor, de inventor e patente",
    94: "Direito de lavra e assemelhado", 95: "Consórcio não contemplado", 96: "Leasing",
    97: "VGBL", 99: "Outros bens e direitos",
}  # fmt: skip

UNKNOWN_TYPE = "Tipo não informado"


def assets_url(year: int) -> str:
    return f"{CDN}/bem_candidato/bem_candidato_{year}.zip"


def category(code: int | None) -> str:
    """Fixed table by type code (design D2)."""
    if code is None:
        return "outros"
    if 1 <= code <= 19:  # noqa: PLR2004 - ranges of the Receita table
        return "imoveis"
    if 21 <= code <= 23:  # noqa: PLR2004
        return "veiculos"
    if 41 <= code <= 49 or 61 <= code <= 79:  # noqa: PLR2004
        return "dinheiro"
    return "outros"


def parse_value(text: str) -> Decimal:
    """ "30000,00" → Decimal("30000.00"); raises ValueError when unreadable. A negative value
    (a few TSE records) is kept as the source informs it."""
    raw = (text or "").strip()
    if "," in raw:  # decimal comma, with or without thousands dots
        raw = raw.replace(".", "").replace(",", ".")
    try:
        value = Decimal(raw)
    except InvalidOperation as error:
        raise ValueError(f"valor ilegível: {text!r}") from error
    return value


@dataclass(frozen=True)
class Asset:
    year: int
    tse_id: str
    order: int
    type_code: int | None
    type_label: str
    category: str
    value: Decimal

    @property
    def source_id(self) -> str:
        return f"{self.year}-{self.tse_id}-{self.order}"


def read_assets(archive: zipfile.ZipFile) -> Iterator[Asset]:
    """Assets of ordinary elections, streamed; the description column is not read."""
    for name in sorted(n for n in archive.namelist() if n.lower().endswith(".csv")):
        with archive.open(name) as raw:
            reader = csv.DictReader(
                io.TextIOWrapper(raw, encoding="latin1", newline=""), delimiter=";"
            )
            fields = set(reader.fieldnames or ())
            order_column = next((c for c in ORDER_COLUMNS if c in fields), None)
            missing = set(COLUMNS) - fields
            if missing or order_column is None:
                raise MissingColumnsError(f"{name}: faltam as colunas {sorted(missing)}")
            for row in reader:
                tse_id, order = clean(row["SQ_CANDIDATO"]), clean(row[order_column])
                if not is_ordinary(row) or not tse_id or not order:
                    continue
                code_text = clean(row["CD_TIPO_BEM_CANDIDATO"])
                code = int(code_text) if code_text and code_text.isdigit() else None
                label = TYPES.get(code) if code is not None else None
                yield Asset(
                    year=int(row["ANO_ELEICAO"]),
                    tse_id=tse_id,
                    order=int(order),
                    type_code=code,
                    type_label=label or clean(row["DS_TIPO_BEM_CANDIDATO"]) or UNKNOWN_TYPE,
                    category=category(code),
                    value=parse_value(row["VR_BEM_CANDIDATO"]),
                )
