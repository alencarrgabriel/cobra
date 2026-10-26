"""Obrasgov.br → Cobra: pure normalization and validation (no I/O).

API checked on 2026-10-26: https://api-publica.obrasgov.gestao.gov.br/obras/openapi.json
"""

import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

API_BASE = "https://api-publica.obrasgov.gestao.gov.br/obras"

STATUS = {
    "Cadastrada": "registered",
    "Em execução": "in_progress",
    "Concluída": "completed",
    "Paralisada": "stopped",
    "Inacabada": "unfinished",
    "Cancelada": "cancelled",
}
WORK_ID = re.compile(r"^\d+\.\d{2}-\d{2}$")
# "POINT (lon lat)"; the source's own latitude/longitude fields are sometimes mis-split
# (e.g. "POINT(-47.86 -15.80)" yields longitude "15.80)"), so we read the WKT ourselves.
WKT_POINT = re.compile(r"POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)", re.IGNORECASE)
# Generous bounding box of Brazil; points outside it are discarded, not published.
BRAZIL_LAT = (Decimal(-34), Decimal(6))
BRAZIL_LON = (Decimal(-74), Decimal(-28))
MAX_PERCENT = Decimal(100)


def work_url(source_id: str) -> str:
    """Public address to check the work at the source."""
    return f"{API_BASE}/projeto-investimento?id_projeto_investimento={source_id}"


def parse_date(value: str | None) -> date | None:
    """Accepts `2024-03-18` and `2024-03-18T00:00:00[.fff]`."""
    if not value:
        return None
    return datetime.fromisoformat(value).date() if "T" in value else date.fromisoformat(value)


def _decimal(value: float | int | str | None) -> Decimal | None:
    return None if value is None else Decimal(str(value))


def parse_pin(pin: dict[str, Any]) -> tuple[Decimal | None, Decimal | None]:
    """(latitude, longitude) of a pin, or (None, None) if missing or outside Brazil."""
    match = WKT_POINT.search(pin.get("pin") or "")
    if not match:
        return None, None
    lon, lat = Decimal(match.group(1)), Decimal(match.group(2))
    if not (BRAZIL_LAT[0] <= lat <= BRAZIL_LAT[1] and BRAZIL_LON[0] <= lon <= BRAZIL_LON[1]):
        return None, None
    return round(lat, 6), round(lon, 6)


def _parties(items: list[dict[str, Any]], prefix: str) -> list[dict[str, str | None]]:
    return [
        {"name": i.get(f"organizacao_{prefix}"), "cnpj": i.get(f"cnpj_{prefix}")}
        for i in items
        if i.get(f"organizacao_{prefix}")
    ]


@dataclass(frozen=True)
class Work:
    source_id: str
    name: str
    description: str | None
    social_function: str | None
    address: str | None
    postal_code: str | None
    nature: str | None
    species: str | None
    axis: str | None
    type: str | None
    subtype: str | None
    status: str
    uf: str
    responsible_org: str | None
    transferors: list[dict[str, str | None]]
    recipients: list[dict[str, str | None]]
    executors: list[dict[str, str | None]]
    planned_value: Decimal | None
    planned_start: date | None
    planned_end: date | None
    actual_start: date | None
    actual_end: date | None
    latitude: Decimal | None
    longitude: Decimal | None
    has_photos: bool
    registered_on: date | None
    quality_notes: tuple[str, ...]


def normalize_work(item: dict[str, Any]) -> Work:
    axis = item.get("eixos_tipos") or [{}]
    latitude, longitude = parse_pin((item.get("pins") or [{}])[0])
    values = [
        i["vl_investimento_previsto"]
        for i in item.get("investimentos_previstos") or []
        if i.get("vl_investimento_previsto") is not None
    ]
    return Work(
        source_id=item["id_projeto_investimento"],
        name=(item.get("desc_nome") or "").strip(),
        description=item.get("desc_projeto"),
        social_function=item.get("desc_funcao_social"),
        address=item.get("desc_endereco"),
        postal_code=item.get("nr_cep"),
        nature=item.get("natureza_intervencao"),
        species=item.get("especie_intervencao"),
        axis=axis[0].get("eixo"),
        type=axis[0].get("tipo"),
        subtype=axis[0].get("subtipo"),
        status=STATUS.get(item.get("situacao") or "", ""),
        uf=item.get("uf_principal") or "",
        responsible_org=item.get("organizacao_resp"),
        transferors=_parties(item.get("repassadores") or [], "repassador"),
        recipients=_parties(item.get("tomadores") or [], "tomador"),
        executors=_parties(item.get("executores") or [], "executor"),
        planned_value=_decimal(sum(values)) if values else None,
        planned_start=parse_date(item.get("dt_inicial_prevista")),
        planned_end=parse_date(item.get("dt_final_prevista")),
        actual_start=parse_date(item.get("dt_inicial_efetiva")),
        actual_end=parse_date(item.get("dt_final_efetiva")),
        latitude=latitude,
        longitude=longitude,
        has_photos=any((f or {}).get("ind_foto") == "SIM" for f in item.get("fotos") or []),
        registered_on=parse_date(item.get("dt_cadastro")),
        quality_notes=tuple(quality_notes(item)),
    )


def validate_work(item: dict[str, Any], expected_uf: str) -> list[str]:
    """Problems that block publishing (design D4). Empty list means valid."""
    source_id = item.get("id_projeto_investimento") or "?"
    problems = []
    if not WORK_ID.match(source_id):
        problems.append(f"obra {source_id}: identificador fora do formato do Obrasgov")
    if item.get("situacao") not in STATUS:
        problems.append(f"obra {source_id}: situação desconhecida {item.get('situacao')!r}")
    if item.get("uf_principal") != expected_uf:
        problems.append(
            f"obra {source_id}: UF principal {item.get('uf_principal')!r}, esperada {expected_uf}"
        )
    if not (item.get("desc_nome") or "").strip():
        problems.append(f"obra {source_id}: sem nome")
    for invest in item.get("investimentos_previstos") or []:
        value = invest.get("vl_investimento_previsto")
        if value is not None and value < 0:
            problems.append(f"obra {source_id}: valor previsto negativo")
    return problems


def quality_notes(item: dict[str, Any]) -> list[str]:
    """Content inconsistencies published as informed by the source, with a note (design D4)."""
    notes = []
    start = parse_date(item.get("dt_inicial_prevista"))
    end = parse_date(item.get("dt_final_prevista"))
    if start and end and end < start:
        notes.append("término previsto anterior ao início previsto, informado assim pela fonte")
    return notes


@dataclass(frozen=True)
class Progress:
    source_id: str
    percent: Decimal
    started_on: date | None
    ended_on: date | None
    updated_on: date | None


def normalize_progress(items: list[dict[str, Any]]) -> list[Progress]:
    return [
        Progress(
            source_id=str(i["id_execucao_fisica"]),
            percent=Decimal(str(i["percentual_execucao_fisica"])),
            started_on=parse_date(i.get("dt_inicial_execucao")),
            ended_on=parse_date(i.get("dt_final_execucao")),
            updated_on=parse_date(i.get("dt_atualizacao_execucao")),
        )
        for i in items
        if i.get("percentual_execucao_fisica") is not None
    ]


def validate_progress(work_id: str, rows: list[Progress]) -> list[str]:
    return [
        f"obra {work_id}: execução física de {row.percent}% fora de 0 a 100"
        for row in rows
        if not Decimal(0) <= row.percent <= MAX_PERCENT
    ]


def latest_progress(rows: list[Progress]) -> Progress | None:
    """The record updated most recently (ties: highest id)."""
    if not rows:
        return None
    return max(rows, key=lambda r: (r.updated_on or date.min, int(r.source_id)))


@dataclass(frozen=True)
class StatusEvent:
    source_id: str
    status: str
    occurred_on: date | None
    justification: str | None
    in_negotiation: bool | None
    negotiation_phase: str | None


def normalize_events(items: list[dict[str, Any]]) -> list[StatusEvent]:
    """Distinct (status, date, justification) events; the source repeats them under new ids."""
    seen: dict[tuple[str, date | None, str | None], StatusEvent] = {}
    for i in sorted(items, key=lambda x: x["id_historico_situacao_investimento"]):
        event = StatusEvent(
            source_id=str(i["id_historico_situacao_investimento"]),
            status=i.get("descricao_historico_situacao_investimento") or "",
            occurred_on=parse_date(i.get("data_historico_situacao_investimento")),
            justification=(i.get("justificativa_cancelada_paralisada") or "").strip() or None,
            in_negotiation={"Sim": True, "Não": False}.get(
                i.get("possui_tratativas_situacao_investimento") or ""
            ),
            negotiation_phase=i.get("fase_tratativas_situacao_investimento"),
        )
        seen.setdefault((event.status, event.occurred_on, event.justification), event)
    return list(seen.values())
