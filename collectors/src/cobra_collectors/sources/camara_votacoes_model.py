"""Câmara plenary votes → Cobra: pure reading and checks (no I/O besides reading local files).

Annual files at dadosabertos.camara.leg.br/arquivos/<set>/csv/<set>-<ano>.csv, checked on
2026-10-27 (UTF-8 with BOM, `;`). See design D1 to D5 of openspec change
`ingestao-camara-votacoes`.
"""

import csv
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

BASE = "https://dadosabertos.camara.leg.br/arquivos"
FIRST_YEAR = 2023  # 57th legislature
PLENARY = "PLEN"
# Above this share of nominal votes whose ballots do not match the official count, the file
# is taken as broken and the year is not published (design D5).
MAX_MISMATCH_SHARE = 0.05
MISMATCH_NOTE = "votos individuais não conferem com o placar oficial"

OPTIONS = {
    "Sim": "sim",
    "Não": "nao",
    "Abstenção": "abstencao",
    "Obstrução": "obstrucao",
    "Artigo 17": "art17",
    "": "nao_informado",
}
ORIENTATIONS = {
    "Sim": "sim",
    "Não": "nao",
    "Liberado": "liberado",
    "Obstrução": "obstrucao",
    "Abstenção": "abstencao",
    "": "nao_informada",
}


def file_url(dataset: str, year: int) -> str:
    return f"{BASE}/{dataset}/csv/{dataset}-{year}.csv"


def vote_url(vote_id: str) -> str:
    return f"https://dadosabertos.camara.leg.br/api/v2/votacoes/{vote_id}"


class UnknownValueError(ValueError):
    """A value outside the known lists (option or orientation): the file changed."""


def _rows(path: Path, columns: tuple[str, ...]) -> Iterator[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        missing = set(columns) - set(reader.fieldnames or ())
        if missing:
            raise UnknownValueError(f"{path.name}: faltam as colunas {sorted(missing)}")
        for row in reader:
            yield {k: (row[k] or "").strip() for k in columns}


@dataclass
class Vote:
    id: str
    occurred_on: date
    registered_at: datetime | None
    description: str
    approved: bool | None
    yes: int
    no: int
    other: int
    main_proposition: str | None
    nominal: bool = False
    notes: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Ballot:
    deputy_id: str
    name: str
    party: str | None
    uf: str | None
    option: str
    voted_at: datetime | None


@dataclass(frozen=True)
class Proposition:
    id: str
    label: str | None
    type: str | None
    summary: str | None


def _datetime(text: str) -> datetime | None:
    try:
        return datetime.fromisoformat(text) if text else None
    except ValueError:
        return None


def _int(text: str) -> int:
    return int(text) if text.isdigit() else 0


VOTE_COLUMNS = ("id", "data", "dataHoraRegistro", "siglaOrgao", "aprovacao", "votosSim",
                "votosNao", "votosOutros", "descricao",
                "ultimaApresentacaoProposicao_idProposicao")  # fmt: skip


def read_votes(path: Path) -> dict[str, Vote]:
    """Plenary votes only."""
    votes: dict[str, Vote] = {}
    for r in _rows(path, VOTE_COLUMNS):
        if r["siglaOrgao"] != PLENARY or not r["id"] or not r["data"]:
            continue
        main = r["ultimaApresentacaoProposicao_idProposicao"]
        votes[r["id"]] = Vote(
            id=r["id"],
            occurred_on=date.fromisoformat(r["data"]),
            registered_at=_datetime(r["dataHoraRegistro"]),
            description=r["descricao"],
            approved={"1": True, "0": False}.get(r["aprovacao"]),
            yes=_int(r["votosSim"]),
            no=_int(r["votosNao"]),
            other=_int(r["votosOutros"]),
            main_proposition=main if main and main != "0" else None,
        )
    return votes


BALLOT_COLUMNS = ("idVotacao", "dataHoraVoto", "voto", "deputado_id", "deputado_nome",
                  "deputado_siglaPartido", "deputado_siglaUf")  # fmt: skip


def read_ballots(path: Path, wanted: set[str]) -> dict[str, dict[str, Ballot]]:
    """Ballots of the `wanted` votes, one per deputy."""
    out: dict[str, dict[str, Ballot]] = {}
    for r in _rows(path, BALLOT_COLUMNS):
        if r["idVotacao"] not in wanted or not r["deputado_id"]:
            continue
        if r["voto"] not in OPTIONS:
            raise UnknownValueError(f"voto desconhecido: {r['voto']!r}")
        uf = r["deputado_siglaUf"]
        out.setdefault(r["idVotacao"], {})[r["deputado_id"]] = Ballot(
            deputy_id=r["deputado_id"],
            name=r["deputado_nome"],
            party=r["deputado_siglaPartido"] or None,
            uf=uf if len(uf) == 2 and uf.isalpha() else None,  # noqa: PLR2004 - UF length
            option=OPTIONS[r["voto"]],
            voted_at=_datetime(r["dataHoraVoto"]),
        )
    return out


ORIENTATION_COLUMNS = ("idVotacao", "siglaBancada", "orientacao")


def read_orientations(path: Path, wanted: set[str]) -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for r in _rows(path, ORIENTATION_COLUMNS):
        if r["idVotacao"] not in wanted or not r["siglaBancada"]:
            continue
        if r["orientacao"] not in ORIENTATIONS:
            raise UnknownValueError(f"orientação desconhecida: {r['orientacao']!r}")
        out.setdefault(r["idVotacao"], {})[r["siglaBancada"]] = ORIENTATIONS[r["orientacao"]]
    return out


PROPOSITION_COLUMNS = ("idVotacao", "proposicao_id", "proposicao_titulo", "proposicao_ementa",
                       "proposicao_siglaTipo")  # fmt: skip


def read_propositions(path: Path, wanted: set[str]) -> dict[tuple[str, str], Proposition]:
    out: dict[tuple[str, str], Proposition] = {}
    for r in _rows(path, PROPOSITION_COLUMNS):
        if r["idVotacao"] in wanted and r["proposicao_id"]:
            out[(r["idVotacao"], r["proposicao_id"])] = Proposition(
                id=r["proposicao_id"],
                label=r["proposicao_titulo"] or None,
                type=r["proposicao_siglaTipo"] or None,
                summary=r["proposicao_ementa"] or None,
            )
    return out


def matches_count(vote: Vote, ballots: dict[str, Ballot]) -> bool:
    """Individual "sim" and "não" add up to the official count (DDR §6.2)."""
    yes = sum(1 for b in ballots.values() if b.option == "sim")
    no = sum(1 for b in ballots.values() if b.option == "nao")
    return yes == vote.yes and no == vote.no


def apply_ballots(
    votes: dict[str, Vote], ballots: dict[str, dict[str, Ballot]]
) -> dict[str, dict[str, Ballot]]:
    """Marks nominal votes and keeps only the ballots that match the official count."""
    published: dict[str, dict[str, Ballot]] = {}
    for vote_id, vote_ballots in ballots.items():
        vote = votes.get(vote_id)
        if vote is None or not vote_ballots:
            continue
        vote.nominal = True
        if matches_count(vote, vote_ballots):
            published[vote_id] = vote_ballots
        else:
            vote.notes.append(MISMATCH_NOTE)
    return published


def mismatch_share(votes: dict[str, Vote]) -> float:
    nominal = [v for v in votes.values() if v.nominal]
    if not nominal:
        return 0.0
    return sum(1 for v in nominal if MISMATCH_NOTE in v.notes) / len(nominal)
