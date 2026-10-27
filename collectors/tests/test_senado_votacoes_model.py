"""Spec votacoes (Senado): options, absences, secret votes, count check (pure)."""

import pytest

from cobra_collectors.sources.camara_votacoes_model import MISMATCH_NOTE, UnknownValueError
from cobra_collectors.sources.senado_votacoes_model import mismatch_share, read
from tests.senado_vote_data import ballot, official, vote


def test_nominal_vote_with_absences_and_orientations() -> None:
    votes, ballots, orientations = read(
        [vote(1, 10, [ballot(1, "Sim"), ballot(2, "Não"), ballot(3, "LS"),
                      ballot(4, "Presidente (art. 51 RISF)"), ballot(5, "P-NRV")])],
        [official(10, 1, 1, {"Governo": "SIM", "Oposição": "NÃO", "PT": "LIVRE", "X": None})],
    )  # fmt: skip
    [v] = votes
    assert (v.nominal, v.secret, v.yes, v.no, v.notes) == (True, False, 1, 1, [])
    assert v.proposition_label == "PLP 55/2026"
    assert [(b.member_id, b.option, b.option_detail) for b in ballots] == [
        ("1", "sim", None), ("2", "nao", None), ("3", "ausente", "Licença saúde"),
        ("4", "presidente", None), ("5", "presente_sem_voto", None),
    ]  # fmt: skip
    assert {o.bench: o.orientation for o in orientations} == {
        "Governo": "sim", "Oposição": "nao", "PT": "liberado", "X": "nao_informada",
    }  # fmt: skip


def test_secret_vote_keeps_only_totals() -> None:
    votes, ballots, _ = read(
        [vote(2, 11, [ballot(1, "Votou"), ballot(2, "LS")], secret=True, totals=(41, 1, 1))], []
    )
    [v] = votes
    assert (v.nominal, v.secret, v.yes, v.no, v.other) == (False, True, 41, 1, 1)
    assert ballots == []


def test_count_mismatch_drops_ballots_and_unknown_values_fail() -> None:
    votes, ballots, _ = read([vote(3, 12, [ballot(1, "Sim")])], [official(12, 50, 3, {})])
    [v] = votes
    assert (v.nominal, v.yes, v.no, v.notes) == (True, 50, 3, [MISMATCH_NOTE])
    assert ballots == []
    assert mismatch_share(votes) == 1.0
    with pytest.raises(UnknownValueError):
        read([vote(4, 13, [ballot(1, "Talvez")])], [])
