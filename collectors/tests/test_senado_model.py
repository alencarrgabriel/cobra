"""Senado normalization and validation with real recorded responses (spec senadores)."""

import copy
import json
from datetime import date
from pathlib import Path
from typing import Any

from cobra_collectors.sources.senado_model import (
    affiliations,
    as_list,
    departure_for,
    mandate_for,
    normalize_name,
    normalize_senator,
    validate_senator,
)

FIXTURES = Path(__file__).parent / "fixtures" / "senado"
TODAY = date(2026, 10, 26)


def load(name: str) -> Any:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def current(code: str) -> dict[str, Any]:
    items = load("lista-atual.json")["ListaParlamentarEmExercicio"]["Parlamentares"]
    return next(
        p
        for p in as_list(items["Parlamentar"])
        if p["IdentificacaoParlamentar"]["CodigoParlamentar"] == code
    )


def out_of_office(code: str) -> dict[str, Any]:
    items = load("afastados.json")["AfastamentoAtual"]["Parlamentares"]
    return next(
        p
        for p in as_list(items["Parlamentar"])
        if p["IdentificacaoParlamentar"]["CodigoParlamentar"] == code
    )


def test_senator_from_the_df() -> None:
    senator = normalize_senator(current("6335"), load("senador-6335.json"))
    assert senator.source_id == "6335"
    assert senator.civil_name == "Damares Regina Alves"
    assert senator.parliamentary_name == "Damares Alves"
    assert senator.birth_date == date(1964, 3, 11)
    assert senator.uf == "DF"
    assert senator.photo_url is not None and senator.photo_url.endswith("senador6335.jpg")


def test_titular_mandates_start_with_their_first_legislature() -> None:
    assert mandate_for(current("6335")).started_on == date(2023, 2, 1)
    older = mandate_for(current("4770"))
    assert (older.legislature, older.started_on, older.status) == (56, date(2019, 2, 1), "titular")


def test_substitute_starts_with_the_open_period_in_office() -> None:
    mandate = mandate_for(current("6358"))
    assert mandate.status == "suplente"
    assert mandate.started_on == date(2026, 10, 6)
    assert mandate.source_id("6358").startswith("6358-")


def test_every_recorded_senator_is_valid() -> None:
    for code in ["6335", "4770", "5977", "6358"]:
        assert validate_senator(current(code), load(f"senador-{code}.json")) == []


def test_structural_problems_block_the_senator() -> None:
    item = copy.deepcopy(current("6335"))
    item["Mandato"]["UfParlamentar"] = "XX"
    item["Mandato"]["DescricaoParticipacao"] = "Outro"
    problems = validate_senator(item, load("senador-6335.json"))
    assert "senador 6335: UF 'XX' desconhecida" in problems
    assert any("participação" in p for p in problems)


def test_titular_on_leave_keeps_the_mandate() -> None:
    result = departure_for(out_of_office("5976"), date(2023, 2, 1), TODAY)
    assert result.keep_open
    assert result.status == "licenciado"
    assert result.unknown_cause is None


def test_titular_who_died_has_the_mandate_ended() -> None:
    result = departure_for(out_of_office("751"), date(2019, 2, 1), TODAY)
    assert not result.keep_open
    assert result.ended_on == date(2020, 10, 21)


def test_titular_who_resigned_after_an_earlier_leave_has_the_mandate_ended() -> None:
    # Real pattern (Flávio Dino): a first period ended by a minister post, a later one by
    # resignation. The latest period decides.
    entry = copy.deepcopy(out_of_office("5976"))
    entry["Mandato"]["Exercicios"]["Exercicio"] = [
        {"DataInicio": "2023-02-01", "DataFim": "2023-02-02", "SiglaCausaAfastamento": "AFO"},
        {"DataInicio": "2024-02-01", "DataFim": "2024-02-20", "SiglaCausaAfastamento": "REN"},
    ]
    result = departure_for(entry, date(2023, 2, 1), TODAY)
    assert not result.keep_open
    assert result.ended_on == date(2024, 2, 20)


def test_substitute_back_to_substitute_has_the_mandate_ended() -> None:
    result = departure_for(out_of_office("6366"), date(2024, 6, 20), TODAY)
    assert not result.keep_open
    assert result.ended_on == date(2024, 10, 17)
    assert not result.approximate


def test_unknown_cause_keeps_a_titular_open_and_reports_it() -> None:
    entry = copy.deepcopy(out_of_office("5976"))
    periods = as_list(entry["Mandato"]["Exercicios"]["Exercicio"])
    last = max(periods, key=lambda p: p["DataInicio"])
    last["SiglaCausaAfastamento"], last["DescricaoCausaAfastamento"] = "XYZ", "Nova causa"
    result = departure_for(entry, date(2023, 2, 1), TODAY)
    assert result.keep_open
    assert result.unknown_cause == "XYZ"


def test_missing_from_both_lists_is_approximate() -> None:
    result = departure_for(None, date(2023, 2, 1), TODAY)
    assert (result.keep_open, result.ended_on, result.approximate) == (False, TODAY, True)


def test_affiliations_keep_the_senate_dates() -> None:
    rows, warnings = affiliations(load("filiacoes-6358.json"))
    assert warnings == []
    by_start = {(a.acronym, a.started_on, a.ended_on) for a in rows}
    assert ("PSB", date(2026, 3, 4), None) in by_start
    assert ("PDT", date(2024, 4, 24), date(2026, 3, 3)) in by_start
    assert sum(a.ended_on is None for a in rows) == 1


def test_incoherent_and_duplicate_open_affiliations_are_dropped() -> None:
    body = copy.deepcopy(load("filiacoes-6358.json"))
    rows = body["FiliacaoParlamentar"]["Parlamentar"]["Filiacoes"]["Filiacao"]
    rows.append(
        {
            "Partido": {"CodigoPartido": "1", "SiglaPartido": "PX", "NomePartido": "X"},
            "DataFiliacao": "2020-01-10",
            "DataDesfiliacao": "2019-01-10",
        }
    )
    rows.append(
        {
            "Partido": {"CodigoPartido": "2", "SiglaPartido": "PY", "NomePartido": "Y"},
            "DataFiliacao": "2010-01-01",
        }
    )
    kept, warnings = affiliations(body)
    assert len(warnings) == 2
    assert {a.acronym for a in kept if a.ended_on is None} == {"PSB"}


def test_single_item_lists_and_names() -> None:
    assert as_list({"a": 1}) == [{"a": 1}]
    assert as_list(None) == []
    assert normalize_name("  Damares  Regina Álves ") == "DAMARES REGINA ALVES"
