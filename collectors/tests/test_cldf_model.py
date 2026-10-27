"""CLDF page reading with real recorded pages (spec deputados-distritais)."""

from datetime import date
from pathlib import Path

from cobra_collectors.sources.cldf_model import (
    legislature_years,
    parse_list,
    parse_profile,
    party_acronym,
    validate_list,
    validate_profile,
)

FIXTURES = Path(__file__).parent / "fixtures" / "cldf"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def test_list_has_the_24_deputies_with_party_photo_and_profile() -> None:
    deputies = parse_list(load("deputados-2023-2026.html"))
    assert len(deputies) == 24
    assert validate_list(deputies) == []
    chico = next(d for d in deputies if d.name == "Chico Vigilante")
    assert chico.source_id == "chico-vigilante-2019-2022"
    assert chico.party_text == "Partido dos Trabalhadores (PT)"
    assert chico.profile_url == "https://www.cl.df.gov.br/web/guest/chico-vigilante-2019-2022"
    assert chico.photo_url is not None and chico.photo_url.startswith("https://www.cl.df.gov.br/")
    jane = next(d for d in deputies if d.name == "Doutora Jane")
    assert jane.profile_url == "https://www.cl.df.gov.br/doutora-jane"


def test_a_page_that_changed_shape_blocks_the_listing() -> None:
    assert validate_list(parse_list("<html>nada aqui</html>")) == [
        "lista da legislatura com 0 deputados (mínimo 20)"
    ]
    few = parse_list(load("deputados-2023-2026.html"))[:5]
    assert validate_list(few)


def test_profile_fields() -> None:
    profile = parse_profile(load("perfil-chico-vigilante-2019-2022.html"))
    assert profile.civil_name == "Francisco Domingos dos Santos"
    assert profile.birth_date == date(1954, 9, 8)
    assert profile.party_text == "Partido dos Trabalhadores (PT)"
    assert validate_profile("x", profile) == []


def test_parties() -> None:
    assert party_acronym("Partido dos Trabalhadores (PT)") == "PT"
    assert party_acronym("Podemos (Podemos)") == "PODE"
    assert party_acronym("Republicanos") == "REPUBLICANOS"
    assert party_acronym("União Brasil") == "UNIÃO"
    assert party_acronym("Partido Socialismo e Liberdade (PSOL)") == "PSOL"
    assert party_acronym("Progressistas (PP)") == "PP"
    # Extinct (merged into União Brasil in 2022) or unknown: no party rather than a wrong one.
    assert party_acronym("Democrata") is None
    assert party_acronym("Partido Inventado") is None
    assert party_acronym(None) is None


def test_recorded_profiles_and_their_parties() -> None:
    expected = {
        "perfil-jorge-vianna-2019-2022.html": ("Jorge Viana de Sousa", None),
        "perfil-doutora-jane.html": ("Jane Klebia do Nascimento Silva", "REPUBLICANOS"),
        "perfil-roberio-negreiros-2019-2022.html": (
            "Robério Bandeira de Negreiros Filho",
            "PODE",
        ),
    }
    for name, (civil, party) in expected.items():
        profile = parse_profile(load(name))
        assert profile.civil_name == civil
        assert party_acronym(profile.party_text) == party


def test_profile_without_name_or_birth_is_invalid() -> None:
    profile = parse_profile("<html><p>Nome completo: </p></html>")
    assert len(validate_profile("x", profile)) == 2


def test_legislature_years() -> None:
    assert legislature_years() == (2023, 2026)
