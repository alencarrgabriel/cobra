"""Government plan reading (spec planos-de-governo)."""

from pathlib import Path

from cobra_collectors.sources.tse_planos_model import (
    candidate_rows,
    elected_ticket,
    extract_pages,
    page_themes,
    pdf_name,
)
from tests.pdf_maker import make_pdf

FIXTURES = Path(__file__).parent / "fixtures" / "tse"
THEMES = {
    "saude": ["saude", "hospital", "hospitais", "ubs"],
    "educacao": ["educacao", "escola", "escolas", "creche"],
}


def test_elected_governor_of_the_df_and_running_mate() -> None:
    rows = candidate_rows((FIXTURES / "consulta_cand_2022_DF.csv").read_bytes())
    ticket = elected_ticket(rows, "GOVERNADOR")
    assert ticket is not None
    assert (ticket.candidate_id, ticket.holder, ticket.party) == (
        "70001651044",
        "IBANEIS ROCHA",
        "MDB",
    )
    assert ticket.running_mate == "CELINA LEÃO"
    assert pdf_name(2022, "DF", ticket.candidate_id) == "DF/2022DF70001651044.pdf"


def test_elected_president_in_the_second_round() -> None:
    rows = candidate_rows((FIXTURES / "consulta_cand_2022_BR.csv").read_bytes())
    ticket = elected_ticket(rows, "PRESIDENTE")
    assert ticket is not None
    assert (ticket.candidate_id, ticket.holder) == ("280001607829", "LULA")
    assert ticket.running_mate == "GERALDO ALCKMIN"


def test_only_the_columns_needed_are_read() -> None:
    rows = candidate_rows((FIXTURES / "consulta_cand_2022_DF.csv").read_bytes())
    assert set(rows[0]) == {
        "DS_CARGO",
        "SQ_CANDIDATO",
        "NM_URNA_CANDIDATO",
        "SG_PARTIDO",
        "SQ_COLIGACAO",
        "DS_SIT_TOT_TURNO",
        "NR_TURNO",
    }


def test_text_by_page() -> None:
    pdf = make_pdf(
        [
            "Vamos ampliar hospitais e UBS. Saude perto de casa.",
            "Novas escolas e creche em cada bairro.",
            "",
        ]
    )
    pages = extract_pages(pdf)
    assert [p.number for p in pages] == [1, 2, 3]
    assert pages[0].text.startswith("Vamos ampliar hospitais")
    assert pages[0].has_text
    assert not pages[2].has_text


def test_themes_need_two_hits_and_ignore_accents() -> None:
    assert page_themes("Mais hospitais e UBS, saúde para todos.", THEMES) == {"saude": 3}
    assert page_themes("Uma escola.", THEMES) == {}
    # Whole words only, so "creches" is not the keyword "creche": one hit is not enough.
    assert page_themes("Escolas e creches", THEMES) == {}
    assert page_themes("Escola e creche, educação integral", THEMES) == {"educacao": 3}
