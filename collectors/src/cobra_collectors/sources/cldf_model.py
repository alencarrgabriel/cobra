"""CLDF site → Cobra: pure HTML reading and validation (no I/O).

Pages checked on 2026-10-26: https://www.cl.df.gov.br/deputados-2023-2026 and the deputies'
profile pages. See design D2 to D5 of openspec change `ingestao-cldf-distritais`.
"""

import html
import re
from dataclasses import dataclass
from datetime import date
from typing import Any

from cobra_collectors.sources.senado_model import normalize_name

SITE = "https://www.cl.df.gov.br"
LIST_PATH = "/deputados-2023-2026"
MIN_DEPUTIES = 20

# Parties in activity (2026), by acronym and by the full name the CLDF site may write.
PARTY_NAMES: dict[str, str] = {
    "AGIR": "Agir",
    "AVANTE": "Avante",
    "CIDADANIA": "Cidadania",
    "DC": "Democracia Cristã",
    "MDB": "Movimento Democrático Brasileiro",
    "MISSÃO": "Partido Missão",
    "MOBILIZA": "Mobiliza",
    "NOVO": "Partido Novo",
    "PCdoB": "Partido Comunista do Brasil",
    "PCO": "Partido da Causa Operária",
    "PDT": "Partido Democrático Trabalhista",
    "PL": "Partido Liberal",
    "PMB": "Partido da Mulher Brasileira",
    "PODE": "Podemos",
    "PP": "Progressistas",
    "PRD": "Partido Renovação Democrática",
    "PSB": "Partido Socialista Brasileiro",
    "PSD": "Partido Social Democrático",
    "PSDB": "Partido da Social Democracia Brasileira",
    "PSOL": "Partido Socialismo e Liberdade",
    "PSTU": "Partido Socialista dos Trabalhadores Unificado",
    "PT": "Partido dos Trabalhadores",
    "PV": "Partido Verde",
    "REDE": "Rede Sustentabilidade",
    "REPUBLICANOS": "Republicanos",
    "SOLIDARIEDADE": "Solidariedade",
    "UNIÃO": "União Brasil",
    "UP": "Unidade Popular",
}
_BY_NAME = {normalize_name(name): acronym for acronym, name in PARTY_NAMES.items()}
_BY_ACRONYM = {normalize_name(acronym): acronym for acronym in PARTY_NAMES}
PROFILE_LABELS = ("Nome completo:", "Nascimento:", "Profissão:", "Partido político:", "Gabinete:")


def page_text(page: str) -> str:
    """Visible text of an HTML page, with single spaces."""
    page = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", page, flags=re.S | re.I)
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page))).strip()


def party_acronym(text: str | None) -> str | None:
    """Acronym of a party in activity, or None for an extinct or unknown party (design D3)."""
    if not text:
        return None
    text = text.strip()
    match = re.search(r"\(([^)]+)\)\s*$", text)
    if match and normalize_name(match.group(1)) in _BY_ACRONYM:
        return _BY_ACRONYM[normalize_name(match.group(1))]
    name = re.sub(r"\s*\([^)]*\)\s*$", "", text)
    return _BY_NAME.get(normalize_name(name)) or _BY_ACRONYM.get(normalize_name(name))


@dataclass(frozen=True)
class ListedDeputy:
    source_id: str
    name: str
    party_text: str
    profile_url: str
    photo_url: str | None


def legislature_years(path: str = LIST_PATH) -> tuple[int, int]:
    match = re.search(r"(\d{4})-(\d{4})", path)
    if not match:
        raise ValueError(f"legislatura não reconhecida em {path!r}")
    return int(match.group(1)), int(match.group(2))


def parse_list(page: str) -> list[ListedDeputy]:
    """Cards of the "Legislatura Atual" block (design D2)."""
    start = page.find("Legislatura Atual")
    if start < 0:
        return []
    end = page.find("portlet-boundary", start)
    block = page[start : end if end > 0 else None]
    deputies = []
    # One card per <a ...card...> link: href, optional photo, name and party.
    for card in re.findall(r"<a [^>]*class=\"card[^\"]*\"[^>]*>.*?</a>", block, re.S):
        href = re.search(r'href="([^"]+)"', card)
        name = re.search(r'card-title">([^<]*)<', card)
        party = re.search(r'card-text">([^<]*)<', card)
        photo = re.search(r'<img [^>]*src="([^"]+)"', card)
        if not (href and name):
            continue
        link = href.group(1)
        deputies.append(
            ListedDeputy(
                source_id=link.rstrip("/").rsplit("/", 1)[-1],
                name=html.unescape(name.group(1)).strip(),
                party_text=html.unescape(party.group(1)).strip() if party else "",
                profile_url=link if link.startswith("http") else f"{SITE}{link}",
                photo_url=html.unescape(photo.group(1)) if photo else None,
            )
        )
    return deputies


def validate_list(deputies: list[ListedDeputy]) -> list[str]:
    """Problems that block the whole listing (design D4)."""
    problems: list[str] = []
    if len(deputies) < MIN_DEPUTIES:
        problems.append(
            f"lista da legislatura com {len(deputies)} deputados (mínimo {MIN_DEPUTIES})"
        )
    for d in deputies:
        if not (d.source_id and d.name and d.party_text):
            problems.append(f"cartão incompleto: {d.source_id or d.name or '?'}")
    ids = [d.source_id for d in deputies]
    if len(ids) != len(set(ids)):
        problems.append("identificadores repetidos na lista")
    return problems


@dataclass(frozen=True)
class Profile:
    civil_name: str
    birth_date: date | None
    party_text: str | None


def _field(text: str, label: str) -> str | None:
    others = "|".join(re.escape(x) for x in PROFILE_LABELS if x != label)
    match = re.search(rf"{re.escape(label)}\s*(.*?)\s*(?:{others}|Redes Sociais|$)", text)
    value = match.group(1).strip() if match else ""
    return value or None


def parse_profile(page: str) -> Profile:
    text = page_text(page)
    birth = _field(text, "Nascimento:")
    birth_date = None
    if birth:
        match = re.match(r"(\d{2})/(\d{2})/(\d{4})", birth)
        if match:
            day, month, year = (int(g) for g in match.groups())
            birth_date = date(year, month, day)
    return Profile(
        civil_name=_field(text, "Nome completo:") or "",
        birth_date=birth_date,
        party_text=_field(text, "Partido político:"),
    )


def validate_profile(source_id: str, profile: Profile) -> list[str]:
    problems = []
    if not profile.civil_name:
        problems.append(f"deputado distrital {source_id}: sem nome completo no perfil")
    if profile.birth_date is None:
        problems.append(f"deputado distrital {source_id}: sem data de nascimento no perfil")
    return problems


def listed_from_payload(payload: dict[str, Any]) -> ListedDeputy:
    return ListedDeputy(**payload)
