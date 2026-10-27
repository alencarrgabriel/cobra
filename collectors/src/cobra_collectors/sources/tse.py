"""TSE adapter: government plans (`plans`) and the candidacies and votes of the politicians in
the registry (`candidacies`, `votes`). See openspec changes `ingestao-planos-de-governo` and
`ingestao-tse-candidaturas` (design D2 and D3)."""

import zipfile
from collections.abc import Iterable

import psycopg

from cobra_collectors.pipeline import Context, JobSpec
from cobra_collectors.sources.tse_candidaturas_model import (
    CANDIDACY_COLUMNS,
    ELECTION_YEARS,
    VOTE_COLUMNS,
    Candidacy,
    Matcher,
    MissingColumnsError,
    Person,
    candidacies_url,
    csv_rows,
    read_candidacies,
    sum_votes,
    votes_url,
)
from cobra_collectors.sources.tse_planos import SOURCE, TsePlanosSource

# Recent general elections must link at least this many candidacies (about 600 congress
# members were elected in them), or the file or the matching is wrong.
RECENT_GENERAL = (2018, 2022)
MIN_RECENT = 400


class TseSource:
    name = SOURCE
    rate_per_second = 1.0  # large public files
    burst = 1

    def __init__(self, min_recent: int = MIN_RECENT) -> None:
        self._plans = TsePlanosSource()
        self._min_recent = min_recent

    def plan(self) -> Iterable[JobSpec]:
        return [
            *self._plans.plan(),
            *(JobSpec("candidacies", str(y), {"year": y}) for y in ELECTION_YEARS),
        ]

    def handle(self, ctx: Context) -> None:
        kind = ctx.job.kind
        if kind == "plans":
            self._plans.handle(ctx)
        elif kind == "candidacies":
            self._candidacies(ctx, int(ctx.job.payload["year"]))
        elif kind == "votes":
            self._votes(ctx, int(ctx.job.payload["year"]))
        else:
            raise ValueError(f"unknown job kind {kind!r}")

    def _candidacies(self, ctx: Context, year: int) -> None:
        url = candidacies_url(year)
        saved = ctx.fetch_file(url)
        if saved.file_path is None:  # pragma: no cover - fetch_file always writes a file
            raise RuntimeError("download without a file")
        matcher = Matcher(_people(ctx.db))
        seen: set[str] = set()
        try:
            with zipfile.ZipFile(saved.file_path) as archive:
                for c in read_candidacies(csv_rows(archive, CANDIDACY_COLUMNS)):
                    match = matcher.match(c) if c.year == year else None
                    if match:
                        _save(ctx.db, c, *match, url)
                        seen.add(c.source_id)
        except MissingColumnsError as error:
            ctx.validate(False, str(error))
        if year in RECENT_GENERAL:
            ctx.validate(
                len(seen) >= self._min_recent,
                f"só {len(seen)} candidaturas ligadas ao cadastro em {year}",
            )
        # A candidacy no longer linked (e.g. a corrected birth date) is removed.
        ctx.db.execute(
            """
            delete from core.candidacies
            where source = 'tse' and election_year = %s and not (source_id = any(%s))
            """,
            (year, list(seen)),
        )
        ctx.enqueue("votes", str(year), {"year": year})

    def _votes(self, ctx: Context, year: int) -> None:
        wanted = {
            (str(r[0]), int(r[1]))
            for r in ctx.db.execute(
                "select tse_candidate_id, round from core.candidacies where election_year = %s",
                (year,),
            )
        }
        if not wanted:
            return
        url = votes_url(year)
        saved = ctx.fetch_file(url)
        if saved.file_path is None:  # pragma: no cover - fetch_file always writes a file
            raise RuntimeError("download without a file")
        try:
            with zipfile.ZipFile(saved.file_path) as archive:
                totals = sum_votes(csv_rows(archive, VOTE_COLUMNS), wanted)
        except MissingColumnsError as error:
            ctx.validate(False, str(error))
        ctx.validate(bool(totals), f"nenhum voto das candidaturas de {year} no arquivo")
        for (tse_id, round_), votes in totals.items():
            ctx.db.execute(
                """
                update core.candidacies set votes = %s, collected_at = now()
                where election_year = %s and tse_candidate_id = %s and round = %s
                """,
                (votes, year, tse_id, round_),
            )


def _people(db: psycopg.Connection) -> list[Person]:
    rows = db.execute(
        """
        select p.id, p.civil_name, p.birth_date, r.cpf from core.politicians p
        left join restricted.politician_private_ids r on r.politician_id = p.id
        """
    ).fetchall()
    return [Person(int(r[0]), r[1], r[2], r[3]) for r in rows]


def _save(db: psycopg.Connection, c: Candidacy, politician_id: int, rule: str, url: str) -> None:
    db.execute(
        """
        insert into core.candidacies (politician_id, election_year, round, office, uf, unit_name,
          party_acronym, ballot_name, ballot_number, candidacy_status, result, tse_candidate_id,
          match_rule, source, source_id, source_url, collected_at)
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'tse', %s, %s, now())
        on conflict (source, source_id) do update set
          politician_id = excluded.politician_id, office = excluded.office, uf = excluded.uf,
          unit_name = excluded.unit_name, party_acronym = excluded.party_acronym,
          ballot_name = excluded.ballot_name, ballot_number = excluded.ballot_number,
          candidacy_status = excluded.candidacy_status, result = excluded.result,
          match_rule = excluded.match_rule, source_url = excluded.source_url,
          collected_at = excluded.collected_at
        """,
        (
            politician_id, c.year, c.round, c.office, c.uf, c.unit_name, c.party, c.ballot_name,
            c.ballot_number, c.status, c.result, c.tse_id, rule, c.source_id, url,
        ),
    )  # fmt: skip
