"""TSE campaign receipts → Cobra: pure reading and aggregation (no I/O).

prestacao_de_contas_eleitorais_candidatos_<ano>.zip on cdn.tse.jus.br, checked on 2026-10-27,
from 2018 to 2024; only receitas_candidatos_<ano>_BRASIL.csv is read, as it sums the UFs. See
design D1 and D2 of openspec change `ingestao-tse-doadores`.

Private persons are only counted and summed: their CPF is used in memory to count distinct
donors and is never kept; no name, address or other column about a donor is read for them.
"""

import csv
import io
import zipfile
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from decimal import Decimal

from cobra_collectors.sources.tse_bens_model import parse_value
from cobra_collectors.sources.tse_candidaturas_model import MissingColumnsError, clean, is_ordinary
from cobra_collectors.sources.tse_planos_model import CDN

RECEIPT_YEARS = (2018, 2020, 2022, 2024)

COLUMNS = ("AA_ELEICAO", "CD_TIPO_ELEICAO", "NM_TIPO_ELEICAO", "SQ_CANDIDATO",
           "CD_ORIGEM_RECEITA", "CD_FONTE_RECEITA", "NR_CPF_CNPJ_DOADOR", "NM_DOADOR_RFB",
           "VR_RECEITA")  # fmt: skip

ORIGINS = {
    "10010100": "proprios",
    "10010200": "pessoas_fisicas",
    "10010400": "pessoas_fisicas",  # donations over the internet
    "10020000": "partidos",
    "10020500": "financiamento_coletivo",
    "10040000": "outros_candidatos",
}
FUNDS = {"2": "fefc", "0": "fundo_partidario"}


def receipts_url(year: int) -> str:
    return f"{CDN}/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_{year}.zip"


def national_csv(year: int) -> str:
    return f"receitas_candidatos_{year}_BRASIL.csv"


def origin(code: str) -> str:
    return ORIGINS.get(code.strip(), "outras")


def fund(code: str) -> str:
    return FUNDS.get(code.strip(), "outros")


@dataclass
class Bucket:
    receipts: int = 0
    total: Decimal = Decimal(0)
    donors: set[str] = field(default_factory=set)


Key = tuple[str, str, str, str | None]  # (SQ_CANDIDATO, origin, fund, party donor name)


@dataclass(frozen=True)
class Summary:
    tse_id: str
    origin: str
    fund: str
    donor_name: str | None
    receipts: int
    donors: int | None
    total: Decimal


def rows_of(archive: zipfile.ZipFile, year: int) -> Iterator[dict[str, str]]:
    name = national_csv(year)
    if name not in archive.namelist():
        raise MissingColumnsError(f"{name} não está no arquivo")
    with archive.open(name) as raw:
        reader = csv.DictReader(io.TextIOWrapper(raw, encoding="latin1", newline=""), delimiter=";")
        missing = set(COLUMNS) - set(reader.fieldnames or ())
        if missing:
            raise MissingColumnsError(f"{name}: faltam as colunas {sorted(missing)}")
        for row in reader:
            yield {k: row[k] for k in COLUMNS}


def summarize(rows: Iterable[dict[str, str]], year: int, wanted: set[str]) -> list[Summary]:
    """Receipts of the `wanted` candidacies, summed by origin, fund and party donor."""
    buckets: dict[Key, Bucket] = {}
    for row in rows:
        tse_id = clean(row["SQ_CANDIDATO"])
        if tse_id not in wanted or not is_ordinary(row) or row["AA_ELEICAO"].strip() != str(year):
            continue
        kind = origin(row["CD_ORIGEM_RECEITA"])
        donor_name = (clean(row["NM_DOADOR_RFB"]) if kind == "partidos" else None) or None
        bucket = buckets.setdefault(
            (tse_id, kind, fund(row["CD_FONTE_RECEITA"]), donor_name), Bucket()
        )
        bucket.receipts += 1
        bucket.total += parse_value(row["VR_RECEITA"])
        if kind == "pessoas_fisicas":
            donor = clean(row["NR_CPF_CNPJ_DOADOR"])
            if donor:
                bucket.donors.add(donor)  # in memory only, to count; never returned
    return [
        Summary(
            tse_id=key[0],
            origin=key[1],
            fund=key[2],
            donor_name=key[3],
            receipts=b.receipts,
            donors=len(b.donors) if key[1] == "pessoas_fisicas" else None,
            total=b.total,
        )
        for key, b in sorted(buckets.items(), key=lambda kv: tuple(str(k) for k in kv[0]))
    ]
