"""Câmara dos Deputados → Cobra: pure normalization and validation (no I/O).

API checked on 2026-10-26: https://dadosabertos.camara.leg.br/api/v2/api-docs (OpenAPI 0.4.347).
See design D2, D3 and D5 of openspec change `ingestao-camara-deputados`.
"""

import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

API_BASE = "https://dadosabertos.camara.leg.br/api/v2"
LEGISLATURE = 57
LEGISLATURE_START = date(2023, 2, 1)

UF_ABBRS = frozenset(
    {
        "AC",
        "AL",
        "AM",
        "AP",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MG",
        "MS",
        "MT",
        "PA",
        "PB",
        "PE",
        "PI",
        "PR",
        "RJ",
        "RN",
        "RO",
        "RR",
        "RS",
        "SC",
        "SE",
        "SP",
        "TO",
    }
)
IN_OFFICE = "Exercício"
ON_LEAVE = "Licença"
# "Efetivado": a substitute who took the seat for good ("Posse como Titular").
CONDITIONS = {"Titular": "titular", "Efetivado": "titular", "Suplente": "suplente"}
CPF = re.compile(r"^\d{11}$")


def deputy_url(deputy_id: int | str) -> str:
    return f"{API_BASE}/deputados/{deputy_id}"


def party_id_from_uri(uri: str | None) -> str | None:
    """`.../partidos/37906` → `37906`."""
    if not uri:
        return None
    tail = uri.rstrip("/").rsplit("/", 1)[-1]
    return tail if tail.isdigit() else None


def _date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.fromisoformat(value).date() if "T" in value else date.fromisoformat(value)


@dataclass(frozen=True)
class Deputy:
    source_id: str
    civil_name: str
    parliamentary_name: str
    birth_date: date | None
    photo_url: str | None
    uf: str
    party_acronym: str | None
    situation: str | None
    condition: str | None
    status_date: date | None
    cpf: str | None


@dataclass(frozen=True)
class Mandate:
    started_on: date
    status: str  # core.mandate_status

    def source_id(self, deputy_id: str) -> str:
        return f"{deputy_id}-{LEGISLATURE}-{self.started_on.isoformat()}"


def normalize_deputy(detail: dict[str, Any]) -> Deputy:
    status = detail.get("ultimoStatus") or {}
    cpf = (detail.get("cpf") or "").strip()
    return Deputy(
        source_id=str(detail.get("id") or ""),
        civil_name=(detail.get("nomeCivil") or "").strip(),
        parliamentary_name=(status.get("nomeEleitoral") or status.get("nome") or "").strip(),
        birth_date=_date(detail.get("dataNascimento")),
        photo_url=status.get("urlFoto") or None,
        uf=(status.get("siglaUf") or "").strip().upper(),
        party_acronym=(status.get("siglaPartido") or "").strip() or None,
        situation=status.get("situacao"),
        condition=status.get("condicaoEleitoral"),
        status_date=_date(status.get("data")),
        cpf=cpf if CPF.match(cpf) else None,
    )


def validate_deputy(detail: dict[str, Any]) -> list[str]:
    """Structural problems that block publishing this deputy (design D5)."""
    status = detail.get("ultimoStatus") or {}
    who = f"deputado {detail.get('id')}"
    problems: list[str] = []
    if not detail.get("id"):
        problems.append("deputado sem identificador")
    if not (detail.get("nomeCivil") or status.get("nomeEleitoral") or status.get("nome")):
        problems.append(f"{who}: sem nome")
    uf = (status.get("siglaUf") or "").strip().upper()
    if uf not in UF_ABBRS:
        problems.append(f"{who}: UF {uf!r} desconhecida")
    if status.get("condicaoEleitoral") not in CONDITIONS:
        problems.append(
            f"{who}: condição eleitoral {status.get('condicaoEleitoral')!r} desconhecida"
        )
    try:
        _date(detail.get("dataNascimento"))
    except ValueError:
        problems.append(f"{who}: data de nascimento inválida {detail.get('dataNascimento')!r}")
    return problems


def cpf_dropped(detail: dict[str, Any]) -> bool:
    """True when the source sent a CPF that is not 11 digits (dropped, not blocking)."""
    raw = (detail.get("cpf") or "").strip()
    return bool(raw) and not CPF.match(raw)


def _timeline(history: list[dict[str, Any]]) -> list[tuple[datetime, str]]:
    """Situation changes of the current legislature, oldest first. Rows without a situation
    ("Nome/Partido no início da legislatura") are ignored (design D3)."""
    rows = [
        (datetime.fromisoformat(h["dataHora"]), h["situacao"])
        for h in history
        if h.get("idLegislatura") == LEGISLATURE and h.get("situacao") and h.get("dataHora")
    ]
    return sorted(rows)


def mandate_for(deputy: Deputy, history: list[dict[str, Any]]) -> Mandate:
    """Mandate of a deputy in the current list (design D3)."""
    timeline = _timeline(history)
    in_office = [when for when, situation in timeline if situation == IN_OFFICE]
    condition = CONDITIONS[deputy.condition or ""]
    if condition == "titular":
        # Leaves do not end a titular's mandate: it starts at the first time in office.
        start = in_office[0].date() if in_office else None
    else:
        # A substitute's mandate is the current period in office.
        start = None
        previous = None
        for when, situation in timeline:
            if situation == IN_OFFICE and previous != IN_OFFICE:
                start = when.date()
            previous = situation
    if start is None:
        start = deputy.status_date or LEGISLATURE_START
    start = max(start, LEGISLATURE_START)
    status = "licenciado" if deputy.situation == ON_LEAVE and condition == "titular" else condition
    return Mandate(started_on=start, status=status)


@dataclass(frozen=True)
class Departure:
    """What happens to an open mandate whose deputy left the current list (design D4)."""

    keep_open: bool
    status: str | None
    ended_on: date | None
    approximate: bool = False


def departure_for(detail: dict[str, Any], started_on: date, collected_on: date) -> Departure:
    status = detail.get("ultimoStatus") or {}
    is_titular = CONDITIONS.get(status.get("condicaoEleitoral") or "") == "titular"
    if is_titular and status.get("situacao") == ON_LEAVE:
        return Departure(keep_open=True, status="licenciado", ended_on=None)
    ended = _date(status.get("data"))
    if ended is None or ended < started_on:
        return Departure(keep_open=False, status=None, ended_on=collected_on, approximate=True)
    return Departure(keep_open=False, status=None, ended_on=ended)
