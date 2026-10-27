"""Câmara normalization and validation with real recorded responses (spec deputados-federais)."""

import copy
import json
from datetime import date
from pathlib import Path
from typing import Any

from cobra_collectors.sources.camara_model import (
    cpf_dropped,
    departure_for,
    mandate_for,
    normalize_deputy,
    party_id_from_uri,
    validate_deputy,
)

FIXTURES = Path(__file__).parent / "fixtures" / "camara"
TODAY = date(2026, 10, 26)


def load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def detail(deputy_id: int) -> dict[str, Any]:
    body: dict[str, Any] = load(f"deputado-{deputy_id}.json")["dados"]
    return body


def history(deputy_id: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = load(f"historico-{deputy_id}.json")["dados"]
    return rows


def test_titular_from_the_df() -> None:
    deputy = normalize_deputy(detail(73579))
    assert deputy.source_id == "73579"
    assert deputy.civil_name == "JOÃO ALBERTO FRAGA SILVA"
    assert deputy.parliamentary_name == "Alberto Fraga"
    assert deputy.birth_date == date(1956, 6, 2)
    assert deputy.uf == "DF"
    assert deputy.party_acronym == "PL"
    assert deputy.photo_url == "https://www.camara.leg.br/internet/deputado/bandep/73579.jpg"
    assert deputy.cpf is not None and len(deputy.cpf) == 11
    mandate = mandate_for(deputy, history(73579))
    assert mandate.started_on == date(2023, 2, 1)
    assert mandate.status == "titular"
    assert mandate.source_id("73579") == "73579-57-2023-02-01"


def test_titular_with_leaves_keeps_the_first_start() -> None:
    # 204372 went on leave and came back four times in the legislature.
    deputy = normalize_deputy(detail(204372))
    mandate = mandate_for(deputy, history(204372))
    assert mandate.started_on == date(2023, 2, 1)
    assert mandate.status == "titular"


def test_substitute_starts_when_taking_office() -> None:
    deputy = normalize_deputy(detail(225846))
    mandate = mandate_for(deputy, history(225846))
    assert mandate.started_on == date(2026, 5, 5)
    assert mandate.status == "suplente"


def test_substitute_back_in_office_starts_a_new_period() -> None:
    rows = [
        *history(225846),
        {"idLegislatura": 57, "dataHora": "2026-06-01T10:00", "situacao": "Fim de Mandato"},
        {"idLegislatura": 57, "dataHora": "2026-09-10T10:00", "situacao": "Exercício"},
    ]
    mandate = mandate_for(normalize_deputy(detail(225846)), rows)
    assert mandate.started_on == date(2026, 9, 10)


def test_rows_of_other_legislatures_are_ignored() -> None:
    rows = [r for r in history(204372) if r["idLegislatura"] != 57]
    deputy = normalize_deputy(detail(204372))
    # Without rows of the current legislature, the last status date is used.
    assert mandate_for(deputy, rows).started_on == date(2024, 1, 4)


def test_substitute_made_titular_counts_as_titular() -> None:
    # 230957 took the seat for good ("Efetivado", "Posse como Titular") on 2025-01-07.
    assert validate_deputy(detail(230957)) == []
    deputy = normalize_deputy(detail(230957))
    mandate = mandate_for(deputy, history(230957))
    assert mandate.status == "titular"
    assert mandate.started_on == date(2025, 1, 7)


def test_titular_on_leave() -> None:
    deputy = normalize_deputy(detail(73806))
    assert deputy.situation == "Licença"
    mandate = mandate_for(deputy, history(73806))
    assert mandate.status == "licenciado"
    assert mandate.started_on == date(2023, 2, 1)


def test_departure_of_a_titular_on_leave_keeps_the_mandate() -> None:
    result = departure_for(detail(73806), date(2023, 2, 1), TODAY)
    assert result.keep_open
    assert result.status == "licenciado"


def test_departure_of_a_substitute_ends_the_mandate() -> None:
    body = copy.deepcopy(detail(225846))
    body["ultimoStatus"].update(situacao="Fim de Mandato", data="2026-10-01")
    result = departure_for(body, date(2026, 5, 5), TODAY)
    assert not result.keep_open
    assert result.ended_on == date(2026, 10, 1)
    assert not result.approximate


def test_departure_without_a_usable_date_is_approximate() -> None:
    body = copy.deepcopy(detail(225846))
    body["ultimoStatus"].update(situacao="Fim de Mandato", data=None)
    result = departure_for(body, date(2026, 5, 5), TODAY)
    assert result.ended_on == TODAY
    assert result.approximate


def test_every_recorded_deputy_is_valid() -> None:
    for deputy_id in [73579, 204372, 225846, 73806, 141533, 160575]:
        assert validate_deputy(detail(deputy_id)) == []


def test_structural_problems_block_the_deputy() -> None:
    body = copy.deepcopy(detail(73579))
    body["ultimoStatus"]["siglaUf"] = "XX"
    body["ultimoStatus"]["condicaoEleitoral"] = "Outro"
    problems = validate_deputy(body)
    assert "deputado 73579: UF 'XX' desconhecida" in problems
    assert any("condição eleitoral" in p for p in problems)
    assert validate_deputy({"ultimoStatus": {}})[0] == "deputado sem identificador"


def test_malformed_cpf_is_dropped_without_blocking() -> None:
    body = copy.deepcopy(detail(73579))
    body["cpf"] = "123"
    assert normalize_deputy(body).cpf is None
    assert cpf_dropped(body)
    assert validate_deputy(body) == []


def test_party_id_from_uri() -> None:
    assert party_id_from_uri("https://dadosabertos.camara.leg.br/api/v2/partidos/37906") == "37906"
    assert party_id_from_uri(None) is None
