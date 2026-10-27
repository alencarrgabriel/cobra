"""TSE government plans → Cobra: pure reading (no I/O).

Files checked on 2026-10-26: proposta_governo_<ano>_<UF>.zip and consulta_cand_<ano>.zip on
cdn.tse.jus.br. See design D1, D4 and D5 of openspec change `ingestao-planos-de-governo`.
"""

import csv
import io
import re
import unicodedata
from dataclasses import dataclass

from pypdf import PdfReader

CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele"
MIN_TEXT = 20
MIN_HITS = 2

# Pilot scope: (scope in the TSE files, office in Cobra, TSE office name, IBGE UF code).
SCOPES = {
    "DF": ("governador", "GOVERNADOR", "53"),
    "BR": ("presidente", "PRESIDENTE", None),
}


def plans_url(year: int, scope: str) -> str:
    return f"{CDN}/proposta_governo/proposta_governo_{year}_{scope}.zip"


def candidates_url(year: int) -> str:
    return f"{CDN}/consulta_cand/consulta_cand_{year}.zip"


def pdf_name(year: int, scope: str, candidate_id: str) -> str:
    return f"{scope}/{year}{scope}{candidate_id}.pdf"


@dataclass(frozen=True)
class Ticket:
    candidate_id: str
    holder: str
    running_mate: str | None
    party: str


# Only these columns are read from the candidates file (design D5, coleta mínima).
_COLUMNS = ("DS_CARGO", "SQ_CANDIDATO", "NM_URNA_CANDIDATO", "SG_PARTIDO", "SQ_COLIGACAO",
            "DS_SIT_TOT_TURNO", "NR_TURNO")  # fmt: skip


def candidate_rows(data: bytes) -> list[dict[str, str]]:
    text = io.TextIOWrapper(io.BytesIO(data), encoding="latin1", newline="")
    return [
        {k: (row.get(k) or "").strip() for k in _COLUMNS}
        for row in csv.DictReader(text, delimiter=";")
    ]


def elected_ticket(rows: list[dict[str, str]], office: str) -> Ticket | None:
    """The elected holder of `office` and the running mate of the same coalition."""
    elected = [
        r for r in rows if r["DS_CARGO"].upper() == office and r["DS_SIT_TOT_TURNO"] == "ELEITO"
    ]
    if len(elected) != 1:
        return None
    holder = elected[0]
    mates = [
        r for r in rows
        if r["DS_CARGO"].upper() == f"VICE-{office}" and r["SQ_COLIGACAO"] == holder["SQ_COLIGACAO"]
    ]  # fmt: skip
    return Ticket(
        candidate_id=holder["SQ_CANDIDATO"],
        holder=holder["NM_URNA_CANDIDATO"],
        running_mate=mates[0]["NM_URNA_CANDIDATO"] if mates else None,
        party=holder["SG_PARTIDO"],
    )


@dataclass(frozen=True)
class Page:
    number: int
    text: str
    has_text: bool


def extract_pages(pdf: bytes) -> list[Page]:
    """Text of every page, spaces normalised, nothing rewritten (design D4)."""
    reader = PdfReader(io.BytesIO(pdf))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = " ".join((page.extract_text() or "").split())
        pages.append(Page(number=i, text=text, has_text=len(text) >= MIN_TEXT))
    return pages


def plain(text: str) -> str:
    """Accent-free lower case, for keyword matching."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def page_themes(text: str, themes: dict[str, list[str]]) -> dict[str, int]:
    """Themes whose keywords appear at least MIN_HITS times on the page, with the count."""
    haystack = plain(text)
    found = {}
    for slug, keywords in themes.items():
        hits = sum(
            len(re.findall(rf"\b{re.escape(plain(keyword))}\b", haystack)) for keyword in keywords
        )
        if hits >= MIN_HITS:
            found[slug] = hits
    return found
