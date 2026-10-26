"""Obrasgov normalization and validation with real recorded responses (spec obras-federais)."""

import json
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from cobra_collectors.sources.obrasgov_model import (
    latest_progress,
    normalize_events,
    normalize_progress,
    normalize_work,
    validate_progress,
    validate_work,
)

FIXTURES = Path(__file__).parent / "fixtures" / "obrasgov"


def load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def project(status: str) -> dict[str, Any]:
    return next(p for p in load("projetos-df-p1.json")["data"] if p["situacao"] == status)


def test_completed_work() -> None:
    work = normalize_work(project("Concluída"))
    assert work.source_id == "30410.53-71"
    assert work.status == "completed"
    assert work.planned_value == Decimal("1000000.0")
    assert work.uf == "DF"
    assert work.planned_start == date(2024, 3, 18)
    assert work.type == "Educação"
    assert work.transferors == [{"name": "MINISTÉRIO DA EDUCAÇÃO", "cnpj": None}]
    assert work.latitude is not None
    assert work.longitude is not None


def test_work_without_pin_has_no_coordinates() -> None:
    item = dict(project("Concluída"), pins=[])
    work = normalize_work(item)
    assert work.latitude is None
    assert work.longitude is None


def test_all_statuses_map() -> None:
    assert {normalize_work(p).status for p in load("projetos-df-p1.json")["data"]} == {
        "completed",
        "in_progress",
        "stopped",
        "registered",
    }


def test_real_page_is_valid() -> None:
    for item in load("projetos-df-p1.json")["data"]:
        assert validate_work(item, "DF") == []


@pytest.mark.parametrize(
    ("change", "message"),
    [
        ({"id_projeto_investimento": "abc"}, "identificador fora do formato"),
        ({"situacao": "Sumida"}, "situação desconhecida"),
        ({"uf_principal": "GO"}, "UF principal 'GO', esperada DF"),
        ({"desc_nome": "  "}, "sem nome"),
        (
            {
                "investimentos_previstos": [
                    {"vl_investimento_previsto": -1, "desc_nome_fonte_recurso": "Federal"}
                ]
            },
            "valor previsto negativo",
        ),
    ],
)
def test_validation_rules(change: dict[str, Any], message: str) -> None:
    problems = validate_work(dict(project("Concluída"), **change), "DF")
    assert any(message in p for p in problems), problems


def test_progress_and_latest() -> None:
    rows = normalize_progress(load("execucao-59698.53-89.json")["data"])
    assert len(rows) == 1
    assert rows[0].percent == Decimal("1.47")
    older = rows[0].__class__("1", Decimal(1), None, None, date(2020, 1, 1))
    assert latest_progress([older, rows[0]]) == rows[0]
    assert latest_progress([]) is None


def test_progress_over_100_is_reported() -> None:
    item = dict(load("execucao-59698.53-89.json")["data"][0], percentual_execucao_fisica=140)
    problems = validate_progress("59698.53-89", normalize_progress([item]))
    assert problems == ["obra 59698.53-89: execução física de 140% fora de 0 a 100"]


def test_repeated_events_collapse_into_one() -> None:
    raw = load("historico-10930.53-87.json")["data"]
    assert len(raw) == 129
    events = normalize_events(raw)
    assert len(events) == 1
    assert events[0].status == "Paralisada"
    assert events[0].occurred_on == date(2025, 5, 7)
    assert events[0].in_negotiation is False
    assert events[0].justification is not None


def test_pin_read_from_wkt_when_source_fields_are_broken() -> None:
    work = normalize_work(project("Cadastrada"))  # source longitude field is "15.8002630106667)"
    assert work.latitude == Decimal("-15.800263")
    assert work.longitude == Decimal("-47.868472")


@pytest.mark.parametrize("pin", ["POINT (0 0)", "POINT (10 50)", "not a point", ""])
def test_pins_outside_brazil_or_invalid_are_dropped(pin: str) -> None:
    work = normalize_work(dict(project("Concluída"), pins=[{"pin": pin}]))
    assert (work.latitude, work.longitude) == (None, None)


def test_end_before_start_is_published_with_a_note() -> None:
    item = dict(
        project("Concluída"), dt_inicial_prevista="2025-01-10", dt_final_prevista="2024-01-10"
    )
    assert validate_work(item, "DF") == []
    work = normalize_work(item)
    assert (work.planned_start, work.planned_end) == (date(2025, 1, 10), date(2024, 1, 10))
    assert work.quality_notes == (
        "término previsto anterior ao início previsto, informado assim pela fonte",
    )
