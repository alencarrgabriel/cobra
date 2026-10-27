"""CLDF adapter: district deputies of the current legislature, read from the official site
(the CLDF has no deputies API). See design D1 to D6 of openspec change
`ingestao-cldf-distritais`."""

from collections.abc import Iterable
from dataclasses import asdict
from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

import psycopg
import structlog

from cobra_collectors.pipeline import Context, JobSpec, ValidationError
from cobra_collectors.sources.cldf_model import (
    LIST_PATH,
    PARTY_NAMES,
    SITE,
    ListedDeputy,
    Profile,
    legislature_years,
    listed_from_payload,
    parse_list,
    parse_profile,
    party_acronym,
    validate_list,
    validate_profile,
)
from cobra_collectors.sources.identity import same_person

SOURCE = "cldf"
DF = "53"
log = structlog.get_logger()


def today() -> date:
    return datetime.now(ZoneInfo("America/Sao_Paulo")).date()


class CldfSource:
    name = SOURCE
    # A public website, not an API: one page per second (design D1).
    rate_per_second = 1.0
    burst = 1

    def plan(self) -> Iterable[JobSpec]:
        return [JobSpec("list", "run", {})]

    def handle(self, ctx: Context) -> None:
        if ctx.job.kind == "list":
            self._list(ctx)
        elif ctx.job.kind == "deputy":
            self._deputy(ctx)
        else:
            raise ValueError(f"unknown job kind {ctx.job.kind!r}")

    def _page(self, ctx: Context, url: str) -> str:
        response = ctx.fetch(url)
        response.raise_for_status()
        return response.text

    # -- jobs ----------------------------------------------------------------------

    def _list(self, ctx: Context) -> None:
        deputies = parse_list(self._page(ctx, f"{SITE}{LIST_PATH}"))
        problems = validate_list(deputies)
        ctx.validate(not problems, "; ".join(problems))
        for deputy in deputies:
            ctx.enqueue("deputy", deputy.source_id, asdict(deputy))
        self._not_listed(ctx.db, {d.source_id for d in deputies})

    def _not_listed(self, db: psycopg.Connection, listed: set[str]) -> None:
        """The site does not tell departures: whoever left the list ends today (design D5)."""
        rows = db.execute(
            """
            select m.id, e.external_id from core.mandates m
            join core.politician_external_ids e
              on e.politician_id = m.politician_id and e.system = 'cldf'
            where m.source = 'cldf' and m.office = 'deputado_distrital' and m.ended_on is null
            """
        ).fetchall()
        ended_on = today()
        for mandate_id, external_id in rows:
            if external_id in listed:
                continue
            log.warning("cldf.approximate_end", deputy=external_id, ended_on=str(ended_on))
            db.execute(
                "update core.mandates set ended_on = %s, collected_at = now() where id = %s",
                (ended_on, mandate_id),
            )

    def _deputy(self, ctx: Context) -> None:
        listed = listed_from_payload(ctx.job.payload)
        profile = parse_profile(self._page(ctx, listed.profile_url))
        problems = validate_profile(listed.source_id, profile)
        ctx.validate(not problems, "; ".join(problems))
        politician_id, own = self._politician(ctx.db, listed, profile)
        party_text = profile.party_text or listed.party_text
        acronym = party_acronym(party_text)
        if acronym is None:
            log.warning("cldf.party_unknown", deputy=listed.source_id, party=party_text)
        self._affiliation(ctx.db, politician_id, own, listed, acronym)
        self._mandate(ctx.db, politician_id, listed)

    def _politician(
        self, db: psycopg.Connection, listed: ListedDeputy, profile: Profile
    ) -> tuple[int, bool]:
        values = (profile.civil_name, listed.name, profile.birth_date, listed.photo_url)
        known = db.execute(
            "select e.politician_id, p.source::text from core.politician_external_ids e "
            "join core.politicians p on p.id = e.politician_id "
            "where e.system = 'cldf' and e.external_id = %s",
            (listed.source_id,),
        ).fetchone()
        if known:
            db.execute(
                """
                update core.politicians set civil_name = %s, parliamentary_name = %s,
                  birth_date = %s, photo_url = %s, collected_at = now()
                where id = %s and source = 'cldf'
                """,
                (*values, known[0]),
            )
            return int(known[0]), known[1] == SOURCE
        politician_id = same_person(db, SOURCE, profile.civil_name, profile.birth_date)
        own = politician_id is None
        if politician_id is None:
            row = db.execute(
                """
                insert into core.politicians (civil_name, parliamentary_name, birth_date,
                  photo_url, source, source_id, source_url, collected_at)
                values (%s, %s, %s, %s, 'cldf', %s, %s, now())
                on conflict (source, source_id) do update set
                  civil_name = excluded.civil_name,
                  parliamentary_name = excluded.parliamentary_name,
                  birth_date = excluded.birth_date, photo_url = excluded.photo_url,
                  collected_at = excluded.collected_at
                returning id
                """,
                (*values, listed.source_id, listed.profile_url),
            ).fetchone()
            if row is None:
                raise RuntimeError("insert returned no row")
            politician_id = int(row[0])
        db.execute(
            """
            insert into core.politician_external_ids (politician_id, system, external_id, source,
              source_id, source_url, collected_at)
            values (%s, 'cldf', %s, 'cldf', %s, %s, now())
            on conflict (system, external_id) do nothing
            """,
            (politician_id, listed.source_id, listed.source_id, listed.profile_url),
        )
        return politician_id, own

    def _party_id(self, db: psycopg.Connection, acronym: str) -> int:
        row = db.execute("select id from core.parties where acronym = %s", (acronym,)).fetchone()
        if row:
            return int(row[0])
        created = db.execute(
            """
            insert into core.parties (acronym, name, source, source_id, source_url, collected_at)
            values (%s, %s, 'cldf', %s, %s, now()) returning id
            """,
            (acronym, PARTY_NAMES[acronym], acronym, f"{SITE}{LIST_PATH}"),
        ).fetchone()
        if created is None:
            raise RuntimeError("insert returned no row")
        return int(created[0])

    def _affiliation(
        self,
        db: psycopg.Connection,
        politician_id: int,
        own: bool,
        listed: ListedDeputy,
        acronym: str | None,
    ) -> None:
        if (
            not own
            and db.execute(
                "select 1 from core.party_affiliations where politician_id = %s "
                "and ended_on is null and source <> 'cldf'",
                (politician_id,),
            ).fetchone()
        ):
            return  # another source keeps the open affiliation (design D3)
        party_id = self._party_id(db, acronym) if acronym else None
        current = db.execute(
            "select id, party_id from core.party_affiliations where politician_id = %s "
            "and source = 'cldf' and ended_on is null",
            (politician_id,),
        ).fetchone()
        if current and current[1] == party_id:
            return
        if current:
            # Party changed, or the informed one is no longer reliable: the old one ends.
            db.execute(
                "update core.party_affiliations set ended_on = %s where id = %s",
                (today(), current[0]),
            )
        if party_id is None:
            return
        started_on = today() if current else None
        db.execute(
            """
            insert into core.party_affiliations (politician_id, party_id, started_on, source,
              source_id, source_url, collected_at)
            values (%s, %s, %s, 'cldf', %s, %s, now())
            on conflict (source, source_id) do update set
              ended_on = null, collected_at = excluded.collected_at
            """,
            (
                politician_id,
                party_id,
                started_on,
                f"{listed.source_id}:{acronym}:{started_on or 'inicial'}",
                listed.profile_url,
            ),
        )

    def _mandate(self, db: psycopg.Connection, politician_id: int, listed: ListedDeputy) -> None:
        first_year, _ = legislature_years()
        started_on = date(first_year, 1, 1)
        house = db.execute("select id from core.legislative_houses where slug = 'cldf'").fetchone()
        if house is None:
            raise ValidationError("casa legislativa CLDF não cadastrada")
        params: dict[str, Any] = {
            "politician": politician_id,
            "house": house[0],
            "uf": DF,
            "legislature": first_year,
            "started": started_on,
            "source_id": f"{listed.source_id}-{first_year}",
            "url": listed.profile_url,
        }
        db.execute(
            """
            insert into core.mandates (politician_id, house_id, office, locality_code,
              legislature, started_on, ended_on, status, source, source_id, source_url,
              collected_at)
            values (%(politician)s, %(house)s, 'deputado_distrital', %(uf)s, %(legislature)s,
                    %(started)s, null, 'titular', 'cldf', %(source_id)s, %(url)s, now())
            on conflict (source, source_id) do update set
              ended_on = null, status = excluded.status, collected_at = excluded.collected_at
            """,
            params,
        )
