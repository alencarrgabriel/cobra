"""Spec trajetoria-eleitoral: reading, matching and votes (pure)."""

import io
import zipfile
from datetime import date

import pytest

from cobra_collectors.sources.tse_candidaturas_model import (
    CANDIDACY_COLUMNS,
    VOTE_COLUMNS,
    Candidacy,
    Matcher,
    MissingColumnsError,
    Person,
    clean,
    csv_rows,
    read_candidacies,
    sum_votes,
)
from tests.tse_files import CANDIDACY_HEADER, VOTE_HEADER, candidacy, tse_zip, vote


def archive(data: bytes) -> zipfile.ZipFile:
    return zipfile.ZipFile(io.BytesIO(data))


def candidacies(rows: list[str]) -> list[Candidacy]:
    data = tse_zip("consulta_cand_2022", CANDIDACY_HEADER, {"DF": rows})
    return list(read_candidacies(csv_rows(archive(data), CANDIDACY_COLUMNS)))


def test_reads_the_needed_fields_and_tse_missing_values() -> None:
    [c] = candidacies(
        [
            candidacy(
                year=2022,
                sq="70001",
                name="MARIA DA SILVA",
                birth="01/02/1970",
                cpf="12345678901",
                party="#NULO#",
            )
        ]
    )
    assert (c.year, c.round, c.office, c.uf, c.tse_id, c.party, c.result) == (
        2022, 1, "DEPUTADO FEDERAL", "DF", "70001", None, "ELEITO",
    )  # fmt: skip
    assert c.birth_date == date(1970, 2, 1)
    assert c.cpf == "12345678901"
    assert c.source_id == "70001-1"
    assert clean("-3") is None and clean(" #NE ") is None


def test_skips_supplementary_elections() -> None:
    rows = [
        candidacy(year=2022, sq="1", name="A", birth="01/01/1970", kind="1",
                  kind_name="ELEIÇÃO SUPLEMENTAR")
    ]  # fmt: skip
    assert candidacies(rows) == []


def test_2006_ordinary_election_comes_with_code_zero() -> None:
    rows = [candidacy(year=2006, sq="1", name="A", birth="01/01/1970", kind="0",
                      kind_name="ORDINÁRIA")]  # fmt: skip
    assert [c.year for c in candidacies(rows)] == [2006]


def test_fails_when_columns_are_missing() -> None:
    data = tse_zip("consulta_cand_2022", "ANO_ELEICAO;SQ_CANDIDATO", {"DF": ['"2022";"1"']})
    with pytest.raises(MissingColumnsError):
        list(csv_rows(archive(data), CANDIDACY_COLUMNS))


PEOPLE = [
    Person(1, "Maria da Silva", date(1970, 2, 1), "12345678901"),
    Person(2, "João Souza", date(1960, 5, 5), None),
    Person(3, "José Lima", date(1955, 3, 3), None),
    Person(4, "JOSE LIMA", date(1955, 3, 3), None),
]


def one(name: str, birth: str, cpf: str = "-4") -> Candidacy:
    return candidacies([candidacy(year=2022, sq="9", name=name, birth=birth, cpf=cpf)])[0]


def test_matches_by_cpf_first() -> None:
    c = one(name="OUTRO NOME", birth="09/09/1999", cpf="12345678901")
    assert Matcher(PEOPLE).match(c) == (1, "cpf")


def test_matches_by_civil_name_and_birth_without_accents() -> None:
    c = one(name="JOAO SOUZA", birth="05/05/1960")
    assert Matcher(PEOPLE).match(c) == (2, "nome-e-nascimento")


def test_does_not_match_homonyms_or_a_different_cpf() -> None:
    m = Matcher(PEOPLE)
    assert m.match(one(name="José Lima", birth="03/03/1955")) is None
    assert m.match(one(name="MARIA DA SILVA", birth="01/02/1970", cpf="99999999999")) is None
    assert m.match(one(name="NINGUEM", birth="01/01/1980")) is None


def test_sums_votes_per_round_for_wanted_candidacies() -> None:
    data = tse_zip(
        "votacao_candidato_munzona_2022",
        VOTE_HEADER,
        {
            "DF": [vote(sq="1", votes=100, zone=1), vote(sq="1", votes=50, zone=2),
                   vote(sq="1", votes=70, round_=2), vote(sq="2", votes=9),
                   vote(sq="1", votes=5, kind="1")],
            "GO": [vote(sq="1", votes=10, zone=9)],
        },
    )  # fmt: skip
    totals = sum_votes(csv_rows(archive(data), VOTE_COLUMNS), {("1", 1), ("1", 2)})
    assert totals == {("1", 1): 160, ("1", 2): 70}
