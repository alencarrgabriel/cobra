"""TSE candidacies and votes → Cobra: pure reading and matching (no I/O).

Files checked on 2026-10-27 at cdn.tse.jus.br (catalog dadosabertos.tse.jus.br): one CSV per
UF inside consulta_cand_<ano>.zip and votacao_candidato_munzona_<ano>.zip, latin-1, `;`, the
same header from 1994 to 2024. See design D2 to D4 of openspec change
`ingestao-tse-candidaturas`.
"""

import csv
import io
import zipfile
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import date

from cobra_collectors.sources.senado_model import normalize_name
from cobra_collectors.sources.tse_planos_model import CDN

# Ordinary elections, general and municipal.
ELECTION_YEARS = tuple(range(1994, 2025, 2))
ORDINARY = "2"
# How the TSE writes "no value".
MISSING = frozenset({"", "#NE", "#NE#", "#NULO", "#NULO#", "-1", "-3", "-4"})
CPF_DIGITS = 11
UF_LENGTH = 2

# Only these columns are read (design D4, coleta mínima). CPF, name and birth date are used to
# match the registry and are never stored.
CANDIDACY_COLUMNS = ("ANO_ELEICAO", "CD_TIPO_ELEICAO", "NM_TIPO_ELEICAO", "NR_TURNO", "SG_UF",
                     "NM_UE", "DS_CARGO",
                     "SQ_CANDIDATO", "NR_CANDIDATO", "NM_CANDIDATO", "NM_URNA_CANDIDATO",
                     "NR_CPF_CANDIDATO", "DS_SITUACAO_CANDIDATURA", "SG_PARTIDO",
                     "DT_NASCIMENTO", "DS_SIT_TOT_TURNO")  # fmt: skip
VOTE_COLUMNS = (
    "CD_TIPO_ELEICAO",
    "NM_TIPO_ELEICAO",
    "NR_TURNO",
    "SQ_CANDIDATO",
    "QT_VOTOS_NOMINAIS",
)


def candidacies_url(year: int) -> str:
    return f"{CDN}/consulta_cand/consulta_cand_{year}.zip"


def votes_url(year: int) -> str:
    return f"{CDN}/votacao_candidato_munzona/votacao_candidato_munzona_{year}.zip"


def is_ordinary(row: dict[str, str]) -> bool:
    """Ordinary election: code 2, or the name, since 2006 comes with code 0 and "ORDINÁRIA"."""
    return row["CD_TIPO_ELEICAO"].strip() == ORDINARY or "ORDINARIA" in normalize_name(
        row["NM_TIPO_ELEICAO"]
    )


def clean(value: str | None) -> str | None:
    text = (value or "").strip()
    return None if text in MISSING else text


def parse_date(value: str | None) -> date | None:
    text = clean(value)
    if not text:
        return None
    try:
        day, month, year = (int(part) for part in text.split("/"))
        return date(year, month, day)
    except ValueError:  # not dd/mm/yyyy, or not a real date
        return None


def parse_cpf(value: str | None) -> str | None:
    text = clean(value)
    return text if text and len(text) == CPF_DIGITS and text.isdigit() else None


@dataclass(frozen=True)
class Candidacy:
    year: int
    round: int
    office: str
    uf: str | None
    unit_name: str | None
    party: str | None
    ballot_name: str | None
    ballot_number: str | None
    status: str | None
    result: str | None
    tse_id: str
    # For matching only; never stored.
    cpf: str | None
    civil_name: str
    birth_date: date | None

    @property
    def source_id(self) -> str:
        return f"{self.tse_id}-{self.round}"


class MissingColumnsError(ValueError):
    """The TSE file does not have the expected columns."""


def csv_rows(archive: zipfile.ZipFile, columns: tuple[str, ...]) -> Iterator[dict[str, str]]:
    """Rows of every CSV in the archive, streamed, with only `columns`."""
    for name in sorted(n for n in archive.namelist() if n.lower().endswith(".csv")):
        with archive.open(name) as raw:
            text = io.TextIOWrapper(raw, encoding="latin1", newline="")
            reader = csv.DictReader(text, delimiter=";")
            missing = set(columns) - set(reader.fieldnames or ())
            if missing:
                raise MissingColumnsError(f"{name}: faltam as colunas {sorted(missing)}")
            for row in reader:
                yield {k: row[k] for k in columns}


def read_candidacies(rows: Iterable[dict[str, str]]) -> Iterator[Candidacy]:
    """Candidacies of ordinary elections."""
    for row in rows:
        tse_id, round_ = clean(row["SQ_CANDIDATO"]), clean(row["NR_TURNO"])
        if not is_ordinary(row) or not tse_id or not round_:
            continue
        uf = clean(row["SG_UF"])
        yield Candidacy(
            year=int(row["ANO_ELEICAO"]),
            round=int(round_),
            office=(clean(row["DS_CARGO"]) or "").upper(),
            uf=uf if uf and len(uf) == UF_LENGTH and uf.isalpha() else None,
            unit_name=clean(row["NM_UE"]),
            party=clean(row["SG_PARTIDO"]),
            ballot_name=clean(row["NM_URNA_CANDIDATO"]),
            ballot_number=clean(row["NR_CANDIDATO"]),
            status=clean(row["DS_SITUACAO_CANDIDATURA"]),
            result=clean(row["DS_SIT_TOT_TURNO"]),
            tse_id=tse_id,
            cpf=parse_cpf(row["NR_CPF_CANDIDATO"]),
            civil_name=clean(row["NM_CANDIDATO"]) or "",
            birth_date=parse_date(row["DT_NASCIMENTO"]),
        )


@dataclass(frozen=True)
class Person:
    id: int
    civil_name: str
    birth_date: date | None
    cpf: str | None


class Matcher:
    """Links a candidacy to a politician of the registry (design D3)."""

    def __init__(self, people: Iterable[Person]) -> None:
        self._by_cpf: dict[str, int] = {}
        self._cpf_of: dict[int, str] = {}
        self._by_name: dict[tuple[str, date], list[int]] = {}
        for p in people:
            if p.cpf:
                self._by_cpf[p.cpf] = p.id
                self._cpf_of[p.id] = p.cpf
            if p.birth_date and p.civil_name:
                key = (normalize_name(p.civil_name), p.birth_date)
                self._by_name.setdefault(key, []).append(p.id)

    def match(self, c: Candidacy) -> tuple[int, str] | None:
        if c.cpf and c.cpf in self._by_cpf:
            return self._by_cpf[c.cpf], "cpf"
        if not c.birth_date or not c.civil_name:
            return None
        ids = self._by_name.get((normalize_name(c.civil_name), c.birth_date), [])
        if len(ids) != 1:
            return None
        known = self._cpf_of.get(ids[0])
        if c.cpf and known and c.cpf != known:
            return None  # same name and birth date, but another person
        return ids[0], "nome-e-nascimento"


def sum_votes(
    rows: Iterable[dict[str, str]], wanted: set[tuple[str, int]]
) -> dict[tuple[str, int], int]:
    """Nominal votes over every zone, per (TSE candidate id, round), for `wanted` only."""
    totals: dict[tuple[str, int], int] = {}
    for row in rows:
        if not is_ordinary(row):
            continue
        tse_id, round_ = clean(row["SQ_CANDIDATO"]), clean(row["NR_TURNO"])
        if not tse_id or not round_:
            continue
        key = (tse_id, int(round_))
        if key not in wanted:
            continue
        votes = clean(row["QT_VOTOS_NOMINAIS"])
        if votes is None or not votes.lstrip("-").isdigit() or int(votes) < 0:
            continue
        totals[key] = totals.get(key, 0) + int(votes)
    return totals
