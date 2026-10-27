"""Writes one year of plenary votes of a house: votes, ballots and orientations (openspec
changes `ingestao-camara-votacoes` and `ingestao-senado-votacoes`). The year is the full truth:
ballots and orientations are written again, and votes no longer in the source are removed."""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime

import psycopg


@dataclass(frozen=True)
class VoteRecord:
    source_id: str
    occurred_on: date
    registered_at: datetime | None
    description: str
    approved: bool | None
    yes: int
    no: int
    other: int
    nominal: bool
    secret: bool
    notes: list[str]
    url: str
    proposition_id: str | None = None
    proposition_label: str | None = None
    proposition_type: str | None = None
    proposition_summary: str | None = None
    proposition_url: str | None = None


@dataclass(frozen=True)
class BallotRecord:
    vote_source_id: str
    member_id: str
    name: str
    party: str | None
    uf: str | None
    option: str
    option_detail: str | None
    voted_at: datetime | None


@dataclass(frozen=True)
class OrientationRecord:
    vote_source_id: str
    bench: str
    orientation: str


def linked_members(db: psycopg.Connection, system: str) -> dict[str, int]:
    """Member id at the house → politician of the registry."""
    return {
        str(r[0]): int(r[1])
        for r in db.execute(
            "select external_id, politician_id from core.politician_external_ids "
            "where system::text = %s",
            (system,),
        )
    }


def save_year(
    db: psycopg.Connection,
    house: str,
    year: int,
    votes: Iterable[VoteRecord],
    ballots: Iterable[BallotRecord],
    orientations: Iterable[OrientationRecord],
) -> None:
    row = db.execute("select id from core.legislative_houses where slug = %s", (house,)).fetchone()
    if row is None:  # pragma: no cover - seeded by the migrations
        raise RuntimeError(f"{house} missing from core.legislative_houses")
    house_id = int(row[0])
    linked = linked_members(db, house)
    now = datetime.now(UTC)
    ids: dict[str, int] = {}
    urls: dict[str, str] = {}
    for v in votes:
        saved = db.execute(
            """
            insert into core.votes (house_id, occurred_on, registered_at, organ, description,
              approved, yes, no, other, nominal, secret, quality_notes, proposition_external_id,
              proposition_label, proposition_type, proposition_summary, proposition_url,
              source, source_id, source_url, collected_at)
            values (%s, %s, %s, 'PLEN', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s)
            on conflict (source, source_id) do update set
              occurred_on = excluded.occurred_on, registered_at = excluded.registered_at,
              description = excluded.description, approved = excluded.approved,
              yes = excluded.yes, no = excluded.no, other = excluded.other,
              nominal = excluded.nominal, secret = excluded.secret,
              quality_notes = excluded.quality_notes,
              proposition_external_id = excluded.proposition_external_id,
              proposition_label = excluded.proposition_label,
              proposition_type = excluded.proposition_type,
              proposition_summary = excluded.proposition_summary,
              proposition_url = excluded.proposition_url, collected_at = excluded.collected_at
            returning id
            """,
            (
                house_id, v.occurred_on, v.registered_at, v.description, v.approved, v.yes, v.no,
                v.other, v.nominal, v.secret, v.notes, v.proposition_id, v.proposition_label,
                v.proposition_type, v.proposition_summary, v.proposition_url, house, v.source_id,
                v.url, now,
            ),
        ).fetchone()  # fmt: skip
        if saved is None:  # pragma: no cover - insert ... returning always yields a row
            raise RuntimeError("insert returned no row")
        ids[v.source_id] = int(saved[0])
        urls[v.source_id] = v.url

    vote_ids = list(ids.values())
    db.execute("delete from core.vote_ballots where vote_id = any(%s)", (vote_ids,))
    db.execute("delete from core.vote_orientations where vote_id = any(%s)", (vote_ids,))
    with db.cursor() as cur:
        with cur.copy(
            "copy core.vote_ballots (vote_id, external_id, name, party_acronym, uf, option, "
            "option_detail, voted_at, politician_id, source, source_id, source_url, "
            "collected_at) from stdin"
        ) as copy:
            for b in ballots:
                copy.write_row(
                    (ids[b.vote_source_id], b.member_id, b.name, b.party, b.uf, b.option,
                     b.option_detail, b.voted_at, linked.get(b.member_id), house,
                     f"{b.vote_source_id}:{b.member_id}", urls[b.vote_source_id], now)
                )  # fmt: skip
        with cur.copy(
            "copy core.vote_orientations (vote_id, bench, orientation, source, source_id, "
            "source_url, collected_at) from stdin"
        ) as copy:
            for o in orientations:
                copy.write_row(
                    (ids[o.vote_source_id], o.bench, o.orientation, house,
                     f"{o.vote_source_id}:{o.bench}", urls[o.vote_source_id], now)
                )  # fmt: skip
    db.execute(
        """
        delete from core.votes
        where source::text = %s and extract(year from occurred_on) = %s
          and not (source_id = any(%s))
        """,
        (house, year, list(ids)),
    )
