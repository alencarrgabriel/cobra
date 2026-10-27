"""Câmara plenary votes: the `votes` job of the `camara` adapter, one per year. See design D1
to D5 of openspec change `ingestao-camara-votacoes`."""

from cobra_collectors.pipeline import Context
from cobra_collectors.sources.camara_votacoes_model import (
    MAX_MISMATCH_SHARE,
    UnknownValueError,
    apply_ballots,
    file_url,
    mismatch_share,
    read_ballots,
    read_orientations,
    read_propositions,
    read_votes,
    vote_url,
)
from cobra_collectors.sources.votes_store import (
    BallotRecord,
    OrientationRecord,
    VoteRecord,
    save_year,
)

DATASETS = ("votacoes", "votacoesVotos", "votacoesOrientacoes", "votacoesProposicoes")
PROPOSITION_URL = "https://www.camara.leg.br/propostas-legislativas/{}"


def collect_votes(ctx: Context, year: int) -> None:
    paths = {}
    for dataset in DATASETS:
        saved = ctx.fetch_file(file_url(dataset, year))
        if saved.file_path is None:  # pragma: no cover - fetch_file always writes a file
            raise RuntimeError("download without a file")
        paths[dataset] = saved.file_path
    try:
        votes = read_votes(paths["votacoes"])
        wanted = set(votes)
        ballots = apply_ballots(votes, read_ballots(paths["votacoesVotos"], wanted))
        orientations = read_orientations(paths["votacoesOrientacoes"], wanted)
        propositions = read_propositions(paths["votacoesProposicoes"], wanted)
    except UnknownValueError as error:
        ctx.validate(False, str(error))
    if not votes:
        return
    ctx.validate(
        any(v.nominal for v in votes.values()),
        f"nenhuma votação nominal do Plenário em {year}",
    )
    share = mismatch_share(votes)
    ctx.validate(
        share <= MAX_MISMATCH_SHARE,
        f"{share:.0%} das votações nominais de {year} não conferem com o placar",
    )

    records = []
    for v in votes.values():
        prop = propositions.get((v.id, v.main_proposition)) if v.main_proposition else None
        records.append(
            VoteRecord(
                source_id=v.id,
                occurred_on=v.occurred_on,
                registered_at=v.registered_at,
                description=v.description,
                approved=v.approved,
                yes=v.yes,
                no=v.no,
                other=v.other,
                nominal=v.nominal,
                secret=False,
                notes=v.notes,
                url=vote_url(v.id),
                proposition_id=prop.id if prop else None,
                proposition_label=prop.label if prop else None,
                proposition_type=prop.type if prop else None,
                proposition_summary=prop.summary if prop else None,
                proposition_url=PROPOSITION_URL.format(prop.id) if prop else None,
            )
        )
    save_year(
        ctx.db,
        "camara",
        year,
        records,
        (
            BallotRecord(vote_id, b.deputy_id, b.name, b.party, b.uf, b.option, None, b.voted_at)
            for vote_id, vote_ballots in ballots.items()
            for b in vote_ballots.values()
        ),
        (
            OrientationRecord(vote_id, bench, orientation)
            for vote_id, benches in orientations.items()
            for bench, orientation in benches.items()
        ),
    )
