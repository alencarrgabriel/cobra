"""Spec votacoes: reading, nominal and symbolic votes, count check (pure)."""

from pathlib import Path

import pytest

from cobra_collectors.sources.camara_votacoes_model import (
    MISMATCH_NOTE,
    Proposition,
    UnknownValueError,
    apply_ballots,
    main_proposition,
    mismatch_share,
    read_ballots,
    read_orientations,
    read_votes,
)
from tests.camara_vote_files import (
    BALLOTS_HEADER,
    ORIENTATIONS_HEADER,
    VOTES_HEADER,
    ballot,
    vote,
    write,
)


def test_only_plenary_votes(tmp_path: Path) -> None:
    write(tmp_path / "v.csv", VOTES_HEADER, [vote("1-1"), vote("2-1", organ="CCJC")])
    votes = read_votes(tmp_path / "v.csv")
    assert list(votes) == ["1-1"]
    assert votes["1-1"].approved is True


def test_nominal_votes_keep_ballots_that_match_the_count(tmp_path: Path) -> None:
    write(tmp_path / "v.csv", VOTES_HEADER,
          [vote("1-1", yes=1, no=1), vote("2-1", yes=404, no=61), vote("3-1")])  # fmt: skip
    write(tmp_path / "b.csv", BALLOTS_HEADER,
          [ballot("1-1", "10", "Sim"), ballot("1-1", "11", "Não"), ballot("1-1", "12", "Artigo 17"),
           ballot("2-1", "10", ""), ballot("2-1", "11", "")])  # fmt: skip
    votes = read_votes(tmp_path / "v.csv")
    published = apply_ballots(votes, read_ballots(tmp_path / "b.csv", set(votes)))
    assert {k: sorted(b.option for b in v.values()) for k, v in published.items()} == {
        "1-1": ["art17", "nao", "sim"]
    }
    assert votes["1-1"].nominal and votes["2-1"].nominal
    assert votes["2-1"].notes == [MISMATCH_NOTE]
    assert not votes["3-1"].nominal  # symbolic: no ballot for anyone
    assert mismatch_share(votes) == 0.5


def test_unknown_values_fail(tmp_path: Path) -> None:
    write(tmp_path / "b.csv", BALLOTS_HEADER, [ballot("1-1", "10", "Talvez")])
    with pytest.raises(UnknownValueError):
        read_ballots(tmp_path / "b.csv", {"1-1"})
    write(tmp_path / "o.csv", ORIENTATIONS_HEADER,
          [{"idVotacao": "1-1", "siglaBancada": "Governo", "orientacao": "Sim"},
           {"idVotacao": "1-1", "siglaBancada": "Oposição", "orientacao": ""}])  # fmt: skip
    assert read_orientations(tmp_path / "o.csv", {"1-1"}) == {
        "1-1": {"Governo": "sim", "Oposição": "nao_informada"}
    }


def test_main_proposition_prefers_the_matter_over_a_request() -> None:
    req = Proposition("95", "REQ 95/2026", "REQ", None)
    pl = Proposition("6132", "PL 6132/2025", "PL", None)
    assert main_proposition("95", [pl, req]) == pl
    assert main_proposition(None, [req, pl]) == pl
    assert main_proposition("6132", [pl]) == pl
    assert main_proposition(None, [req]) == req
    assert main_proposition(None, []) is None
