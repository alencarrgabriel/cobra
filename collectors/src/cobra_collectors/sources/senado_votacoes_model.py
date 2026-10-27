"""Senado plenary votes → Cobra: pure reading of the API JSON (no I/O).

`GET /dadosabertos/votacao.json?dataInicio&dataFim` and
`GET /dadosabertos/plenario/votacao/orientacaoBancada/{inicio}/{fim}.json`, OpenAPI checked on
2026-10-27. See design D2 to D4 of openspec change `ingestao-senado-votacoes`.
"""

from collections import Counter
from datetime import date, datetime
from typing import Any

from cobra_collectors.sources.camara_votacoes_model import MISMATCH_NOTE, UnknownValueError
from cobra_collectors.sources.senado_model import API_BASE
from cobra_collectors.sources.votes_store import BallotRecord, OrientationRecord, VoteRecord

FIRST_YEAR = 2023  # 57th legislature
SENATE = "SF"

# siglaVotoParlamentar → (option, detail). The detail of an absence is the Senate's own
# description (descricaoVotoParlamentar) when it sends one. "Votou" appears only in secret
# votes and is never stored.
OPTIONS: dict[str, tuple[str, str | None]] = {
    "Sim": ("sim", None),
    "Não": ("nao", None),
    "Abstenção": ("abstencao", None),
    "Obstrução": ("obstrucao", None),
    "Presidente (art. 51 RISF)": ("presidente", None),
    "P-NRV": ("presente_sem_voto", None),
    "AP": ("ausente", "AP"),
    "MIS": ("ausente", "MIS"),
    "LS": ("ausente", "LS"),
    "LP": ("ausente", "LP"),
    "NCom": ("ausente", "NCom"),
    "LAP": ("ausente", "LAP"),
    "NA": ("nao_informado", None),
    "": ("nao_informado", None),
}
ORIENTATIONS = {
    "SIM": "sim",
    "NÃO": "nao",
    "LIVRE": "liberado",
    "OBSTRUÇÃO": "obstrucao",
    "ABSTENÇÃO": "abstencao",
    "": "nao_informada",
}


def votes_url() -> str:
    return f"{API_BASE}/votacao.json"


def orientations_url(year: int) -> str:
    return f"{API_BASE}/plenario/votacao/orientacaoBancada/{year}0101/{year}1231.json"


def matter_url(code: object) -> str | None:
    return f"https://www25.senado.leg.br/web/atividade/materias/-/materia/{code}" if code else None


def _int(value: object) -> int:
    return int(value) if isinstance(value, int) else 0


def _uf(value: object) -> str | None:
    text = str(value or "")
    return text if len(text) == 2 and text.isalpha() else None  # noqa: PLR2004 - UF length


def read(
    items: list[dict[str, Any]], orientation_items: list[dict[str, Any]]
) -> tuple[list[VoteRecord], list[BallotRecord], list[OrientationRecord]]:
    """Votes, ballots and orientations of the Senate plenary, with the count check (D4)."""
    official = {o.get("sequencialVotacao"): o for o in orientation_items}
    votes: list[VoteRecord] = []
    ballots: list[BallotRecord] = []
    orientations: list[OrientationRecord] = []
    for item in items:
        if item.get("casaSessao") != SENATE or not item.get("codigoSessaoVotacao"):
            continue
        source_id = str(item["codigoSessaoVotacao"])
        secret = item.get("votacaoSecreta") == "S"
        item_ballots = [] if secret else _ballots(item, source_id)
        count = Counter(b.option for b in item_ballots)
        official_item = official.get(item.get("sequencialVotacao"))
        notes: list[str] = []
        if secret:
            yes, no = _int(item.get("totalVotosSim")), _int(item.get("totalVotosNao"))
            other = _int(item.get("totalVotosAbstencao"))
        else:
            yes, no, other = count["sim"], count["nao"], count["abstencao"]
            if official_item and (
                official_item.get("qtdVotosSim") != yes or official_item.get("qtdVotosNao") != no
            ):
                notes.append(MISMATCH_NOTE)
                yes = _int(official_item.get("qtdVotosSim"))
                no = _int(official_item.get("qtdVotosNao"))
                item_ballots = []
        nominal = not secret and (bool(item_ballots) or bool(notes))
        if not notes:
            ballots.extend(item_ballots)
        votes.append(
            VoteRecord(
                source_id=source_id,
                occurred_on=date.fromisoformat(str(item["dataSessao"])[:10]),
                registered_at=_datetime(official_item.get("dataInicioVotacao"))
                if official_item
                else None,
                description=str(item.get("descricaoVotacao") or ""),
                approved={"A": True, "R": False}.get(str(item.get("resultadoVotacao"))),
                yes=yes,
                no=no,
                other=other,
                nominal=nominal,
                secret=secret,
                notes=notes,
                url=f"{votes_url()}?codigoSessao={item.get('codigoSessao')}",
                proposition_id=str(item["codigoMateria"]) if item.get("codigoMateria") else None,
                proposition_label=item.get("identificacao") or None,
                proposition_type=item.get("sigla") or None,
                proposition_summary=item.get("ementa") or None,
                proposition_url=matter_url(item.get("codigoMateria")),
            )
        )
        for o in (official_item or {}).get("orientacoesLideranca") or []:
            bench = str(o.get("partido") or "")
            value = str(o.get("voto") or "")
            if not bench:
                continue
            if value not in ORIENTATIONS:
                raise UnknownValueError(f"orientação desconhecida: {value!r}")
            orientations.append(OrientationRecord(source_id, bench, ORIENTATIONS[value]))
    return votes, ballots, _unique(orientations)


def _ballots(item: dict[str, Any], source_id: str) -> list[BallotRecord]:
    """Ballots of a nominal vote, one per senator, absences included (D3)."""
    out: dict[str, BallotRecord] = {}
    for b in item.get("votos") or []:
        code = str(b.get("siglaVotoParlamentar") or "")
        if code not in OPTIONS:
            raise UnknownValueError(f"voto desconhecido: {code!r}")
        option, detail = OPTIONS[code]
        if detail is not None or option == "nao_informado":
            detail = str(b.get("descricaoVotoParlamentar") or "") or detail
        member = str(b["codigoParlamentar"])
        out.setdefault(
            member,
            BallotRecord(
                vote_source_id=source_id,
                member_id=member,
                name=str(b.get("nomeParlamentar") or ""),
                party=b.get("siglaPartidoParlamentar") or None,
                uf=_uf(b.get("siglaUFParlamentar")),
                option=option,
                option_detail=detail,
                voted_at=None,
            ),
        )
    return list(out.values())


def _unique(orientations: list[OrientationRecord]) -> list[OrientationRecord]:
    """One orientation per bench and vote: the last one the Senate recorded."""
    return list({(o.vote_source_id, o.bench): o for o in orientations}.values())


def _datetime(value: object) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value)) if value else None
    except ValueError:
        return None


def mismatch_share(votes: list[VoteRecord]) -> float:
    nominal = [v for v in votes if v.nominal]
    if not nominal:
        return 0.0
    return sum(1 for v in nominal if MISMATCH_NOTE in v.notes) / len(nominal)
