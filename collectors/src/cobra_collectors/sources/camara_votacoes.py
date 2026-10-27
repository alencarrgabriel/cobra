"""Câmara plenary votes: the `votes` job of the `camara` adapter, one per year. See design D1
to D5 of openspec change `ingestao-camara-votacoes`."""

from datetime import UTC, datetime

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

    db = ctx.db
    house = db.execute("select id from core.legislative_houses where slug = 'camara'").fetchone()
    if house is None:  # pragma: no cover - seeded by the migrations
        raise RuntimeError("Câmara missing from core.legislative_houses")
    linked = {
        str(r[0]): int(r[1])
        for r in db.execute(
            "select external_id, politician_id from core.politician_external_ids "
            "where system = 'camara'"
        )
    }
    now = datetime.now(UTC)
    ids: dict[str, int] = {}
    for v in votes.values():
        prop = propositions.get((v.id, v.main_proposition)) if v.main_proposition else None
        row = db.execute(
            """
            insert into core.votes (house_id, occurred_on, registered_at, organ, description,
              approved, yes, no, other, nominal, quality_notes, proposition_external_id,
              proposition_label, proposition_type, proposition_summary, proposition_url,
              source, source_id, source_url, collected_at)
            values (%s, %s, %s, 'PLEN', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    'camara', %s, %s, %s)
            on conflict (source, source_id) do update set
              occurred_on = excluded.occurred_on, registered_at = excluded.registered_at,
              description = excluded.description, approved = excluded.approved,
              yes = excluded.yes, no = excluded.no, other = excluded.other,
              nominal = excluded.nominal, quality_notes = excluded.quality_notes,
              proposition_external_id = excluded.proposition_external_id,
              proposition_label = excluded.proposition_label,
              proposition_type = excluded.proposition_type,
              proposition_summary = excluded.proposition_summary,
              proposition_url = excluded.proposition_url, collected_at = excluded.collected_at
            returning id
            """,
            (
                house[0], v.occurred_on, v.registered_at, v.description, v.approved, v.yes,
                v.no, v.other, v.nominal, v.notes, prop.id if prop else None,
                prop.label if prop else None, prop.type if prop else None,
                prop.summary if prop else None,
                PROPOSITION_URL.format(prop.id) if prop else None,
                v.id, vote_url(v.id), now,
            ),
        ).fetchone()  # fmt: skip
        if row is None:  # pragma: no cover - insert ... returning always yields a row
            raise RuntimeError("insert returned no row")
        ids[v.id] = int(row[0])

    # The year's files are the full truth: ballots and orientations are written again.
    vote_ids = list(ids.values())
    db.execute("delete from core.vote_ballots where vote_id = any(%s)", (vote_ids,))
    db.execute("delete from core.vote_orientations where vote_id = any(%s)", (vote_ids,))
    with db.cursor() as cur:
        with cur.copy(
            "copy core.vote_ballots (vote_id, external_id, name, party_acronym, uf, option, "
            "voted_at, politician_id, source, source_id, source_url, collected_at) from stdin"
        ) as copy:
            for vote_id, vote_ballots in ballots.items():
                for b in vote_ballots.values():
                    copy.write_row(
                        (ids[vote_id], b.deputy_id, b.name, b.party, b.uf, b.option, b.voted_at,
                         linked.get(b.deputy_id), "camara", f"{vote_id}:{b.deputy_id}",
                         vote_url(vote_id), now)
                    )  # fmt: skip
        with cur.copy(
            "copy core.vote_orientations (vote_id, bench, orientation, source, source_id, "
            "source_url, collected_at) from stdin"
        ) as copy:
            for vote_id, benches in orientations.items():
                for bench, orientation in benches.items():
                    copy.write_row(
                        (ids[vote_id], bench, orientation, "camara", f"{vote_id}:{bench}",
                         vote_url(vote_id), now)
                    )  # fmt: skip
    # Votes of the year no longer in the file are removed with their ballots.
    db.execute(
        """
        delete from core.votes
        where source = 'camara' and extract(year from occurred_on) = %s
          and not (source_id = any(%s))
        """,
        (year, list(ids)),
    )
