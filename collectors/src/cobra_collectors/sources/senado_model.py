"""Senado Federal → Cobra: pure normalization and validation (no I/O).

API checked on 2026-10-26: https://legis.senado.leg.br/dadosabertos/v3/api-docs (OpenAPI 4.1.3.106).
See design D2 to D6 of openspec change `ingestao-senado-senadores`.
"""

import unicodedata
from dataclasses import dataclass
from datetime import date
from typing import Any

from cobra_collectors.sources.camara_model import UF_ABBRS

API_BASE = "https://legis.senado.leg.br/dadosabertos"
NO_PARTY = "S/Partido"
# Causes of leaving that end a titular's mandate for good (design D4); any other cause is a
# temporary leave (licença, cargo de ministro ou secretário).
FINAL_CAUSES = frozenset({"REN", "FAL", "CAS", "PER"})


def senator_url(code: str) -> str:
    return f"{API_BASE}/senador/{code}"


def as_list(value: Any) -> list[Any]:
    """The API sends a single item as an object and several as a list."""
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _date(value: str | None) -> date | None:
    return date.fromisoformat(value[:10]) if value else None


def normalize_name(name: str) -> str:
    """For matching the same person across sources: no accents, upper case, single spaces."""
    plain = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(plain.upper().split())


@dataclass(frozen=True)
class Senator:
    source_id: str
    civil_name: str
    parliamentary_name: str
    birth_date: date | None
    photo_url: str | None
    uf: str


def _identification(item: dict[str, Any]) -> dict[str, Any]:
    ident: dict[str, Any] = item.get("IdentificacaoParlamentar") or {}
    return ident


def normalize_senator(item: dict[str, Any], detail: dict[str, Any]) -> Senator:
    ident = _identification(item)
    basics = ((detail.get("DetalheParlamentar") or {}).get("Parlamentar") or {}).get(
        "DadosBasicosParlamentar"
    ) or {}
    mandate = item.get("Mandato") or {}
    return Senator(
        source_id=str(ident.get("CodigoParlamentar") or ""),
        civil_name=(ident.get("NomeCompletoParlamentar") or "").strip(),
        parliamentary_name=(ident.get("NomeParlamentar") or "").strip(),
        birth_date=_date(basics.get("DataNascimento")),
        photo_url=ident.get("UrlFotoParlamentar") or None,
        uf=(mandate.get("UfParlamentar") or ident.get("UfParlamentar") or "").strip().upper(),
    )


def participation(item: dict[str, Any]) -> str | None:
    """`titular`, `suplente` or None when unknown."""
    text = ((item.get("Mandato") or {}).get("DescricaoParticipacao") or "").strip()
    if text == "Titular":
        return "titular"
    if text.endswith("Suplente"):
        return "suplente"
    return None


def validate_senator(item: dict[str, Any], detail: dict[str, Any]) -> list[str]:
    """Structural problems that block publishing this senator."""
    ident = _identification(item)
    code = ident.get("CodigoParlamentar")
    who = f"senador {code}"
    problems: list[str] = []
    if not code:
        return ["senador sem identificador"]
    if not (ident.get("NomeCompletoParlamentar") or ident.get("NomeParlamentar")):
        problems.append(f"{who}: sem nome")
    uf = ((item.get("Mandato") or {}).get("UfParlamentar") or "").strip().upper()
    if uf not in UF_ABBRS:
        problems.append(f"{who}: UF {uf!r} desconhecida")
    if participation(item) is None:
        text = (item.get("Mandato") or {}).get("DescricaoParticipacao")
        problems.append(f"{who}: participação {text!r} desconhecida")
    first = (item.get("Mandato") or {}).get("PrimeiraLegislaturaDoMandato") or {}
    if not (first.get("NumeroLegislatura") and first.get("DataInicio")):
        problems.append(f"{who}: mandato sem legislatura")
    try:
        normalize_senator(item, detail)
    except ValueError as error:
        problems.append(f"{who}: data inválida ({error})")
    return problems


def _exercises(item: dict[str, Any]) -> list[dict[str, Any]]:
    rows = as_list(((item.get("Mandato") or {}).get("Exercicios") or {}).get("Exercicio"))
    return sorted((r for r in rows if r.get("DataInicio")), key=lambda r: r["DataInicio"])


@dataclass(frozen=True)
class Mandate:
    mandate_code: str
    legislature: int
    started_on: date
    status: str  # core.mandate_status

    def source_id(self, senator_code: str) -> str:
        return f"{senator_code}-{self.mandate_code}-{self.started_on.isoformat()}"


def mandate_for(item: dict[str, Any]) -> Mandate:
    """Mandate of a senator in the current list (design D3)."""
    mandate = item.get("Mandato") or {}
    first = mandate.get("PrimeiraLegislaturaDoMandato") or {}
    role = participation(item) or "titular"
    start = _date(first.get("DataInicio"))
    if role == "suplente":
        open_periods = [r for r in _exercises(item) if not r.get("DataFim")]
        if open_periods:
            start = _date(open_periods[-1]["DataInicio"])
    if start is None:
        raise ValueError("mandato sem data de início")
    return Mandate(
        mandate_code=str(mandate.get("CodigoMandato") or ""),
        legislature=int(first["NumeroLegislatura"]),
        started_on=start,
        status=role,
    )


@dataclass(frozen=True)
class Departure:
    keep_open: bool
    status: str | None
    ended_on: date | None
    approximate: bool = False
    unknown_cause: str | None = None


def departure_for(off: dict[str, Any] | None, started_on: date, collected_on: date) -> Departure:
    """What happens to an open mandate of someone not in office (design D4). `off` is the
    senator's entry in the list of senators out of office, if any."""
    if off is None:
        return Departure(keep_open=False, status=None, ended_on=collected_on, approximate=True)
    periods = _exercises(off)
    if participation(off) == "titular":
        # A titular's mandate spans several periods in office; the latest one says how it ended.
        period = periods[-1] if periods else {}
    else:
        # A substitute's mandate is one period: the one that started with it.
        same = [p for p in periods if _date(p["DataInicio"]) == started_on]
        period = same[-1] if same else (periods[-1] if periods else {})
    ended = _date(period.get("DataFim"))
    cause = period.get("SiglaCausaAfastamento")
    if participation(off) == "titular" and cause not in FINAL_CAUSES:
        known = cause in {"LCS", "AFO"} or (
            period.get("DescricaoCausaAfastamento") or ""
        ).startswith("Licença")
        return Departure(
            keep_open=True,
            status="licenciado",
            ended_on=None,
            unknown_cause=None if known else cause,
        )
    if ended is None or ended < started_on:
        return Departure(keep_open=False, status=None, ended_on=collected_on, approximate=True)
    return Departure(keep_open=False, status=None, ended_on=ended)


@dataclass(frozen=True)
class Affiliation:
    party_code: str
    acronym: str
    party_name: str
    started_on: date | None
    ended_on: date | None

    def source_id(self, senator_code: str) -> str:
        start = self.started_on.isoformat() if self.started_on else "sem-data"
        return f"{senator_code}:{self.party_code}:{start}"


def affiliations(body: dict[str, Any]) -> tuple[list[Affiliation], list[str]]:
    """Party history with the Senate's dates (design D5), plus warnings for dropped rows."""
    parlamentar = (body.get("FiliacaoParlamentar") or {}).get("Parlamentar") or {}
    rows = as_list((parlamentar.get("Filiacoes") or {}).get("Filiacao"))
    kept: list[Affiliation] = []
    warnings: list[str] = []
    for row in rows:
        party = row.get("Partido") or {}
        acronym = (party.get("SiglaPartido") or "").strip()
        if not acronym or acronym == NO_PARTY or not party.get("CodigoPartido"):
            continue
        started, ended = _date(row.get("DataFiliacao")), _date(row.get("DataDesfiliacao"))
        if started and ended and ended < started:
            warnings.append(f"filiação {acronym} com fim antes do início, descartada")
            continue
        kept.append(
            Affiliation(
                party_code=str(party["CodigoPartido"]),
                acronym=acronym,
                party_name=(party.get("NomePartido") or acronym).strip(),
                started_on=started,
                ended_on=ended,
            )
        )
    open_rows = sorted(
        (a for a in kept if a.ended_on is None), key=lambda a: a.started_on or date.min
    )
    for extra in open_rows[:-1]:
        warnings.append(f"segunda filiação aberta ({extra.acronym}) descartada")
        kept.remove(extra)
    return kept, warnings
