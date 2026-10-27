"""Senado Federal adapter: senators in office. See design D1 to D6 of openspec change
`ingestao-senado-senadores`."""

from collections.abc import Iterable
from dataclasses import replace
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import psycopg
import structlog

from cobra_collectors.pipeline import Context, JobSpec, ValidationError
from cobra_collectors.sources.camara_votacoes_model import MAX_MISMATCH_SHARE, UnknownValueError
from cobra_collectors.sources.identity import same_person
from cobra_collectors.sources.senado_model import (
    API_BASE,
    Mandate,
    Senator,
    affiliations,
    as_list,
    departure_for,
    mandate_for,
    normalize_senator,
    participation,
    senator_url,
    validate_senator,
)
from cobra_collectors.sources.senado_votacoes_model import (
    FIRST_YEAR,
    mismatch_share,
    orientations_url,
    read,
    votes_url,
)
from cobra_collectors.sources.votes_store import save_year

SOURCE = "senado"
log = structlog.get_logger()


def today() -> date:
    """Collection date in Brasília, where the Senate's dates are."""
    return datetime.now(ZoneInfo("America/Sao_Paulo")).date()


def _code(item: dict[str, Any]) -> str:
    return str((item.get("IdentificacaoParlamentar") or {}).get("CodigoParlamentar") or "")


class SenadoSource:
    name = SOURCE
    # Official limit: more than 10 req/s may get HTTP 429 (design D1).
    rate_per_second = 8.0
    burst = 4

    def __init__(self, vote_years: Iterable[int] | None = None) -> None:
        # Years of plenary votes to collect; by default the legislature up to this year.
        self.vote_years = (
            tuple(vote_years)
            if vote_years is not None
            else tuple(range(FIRST_YEAR, today().year + 1))
        )

    def plan(self) -> Iterable[JobSpec]:
        return [
            JobSpec("senators", "run", {}),
            *(JobSpec("votes", str(year), {"year": year}) for year in self.vote_years),
        ]

    def handle(self, ctx: Context) -> None:
        kind = ctx.job.kind
        if kind == "senators":
            self._senators(ctx)
        elif kind == "senator":
            self._senator(ctx)
        elif kind == "votes":
            self._votes(ctx, int(ctx.job.payload["year"]))
        else:
            raise ValueError(f"unknown job kind {kind!r}")

    def _get(self, ctx: Context, path: str) -> Any:
        # Without the suffix the API answers in XML: our client sends no Accept header.
        response = ctx.fetch(f"{API_BASE}/{path}.json")
        response.raise_for_status()
        return response.json()

    # -- jobs ----------------------------------------------------------------------

    def _votes(self, ctx: Context, year: int) -> None:
        """Plenary votes of a year (openspec change `ingestao-senado-votacoes`, D1 to D4)."""
        response = ctx.fetch(
            votes_url(), {"dataInicio": f"{year}-01-01", "dataFim": f"{year}-12-31"}
        )
        response.raise_for_status()
        items = response.json()
        response = ctx.fetch(orientations_url(year))
        response.raise_for_status()
        orientation_items = (response.json() or {}).get("votacoes") or []
        try:
            votes, ballots, orientations = read(items or [], orientation_items)
        except UnknownValueError as error:
            ctx.validate(False, str(error))
        if not votes:
            return
        share = mismatch_share(votes)
        ctx.validate(
            share <= MAX_MISMATCH_SHARE,
            f"{share:.0%} das votações nominais de {year} não conferem com o placar",
        )
        save_year(ctx.db, "senado", year, votes, ballots, orientations)

    def _senators(self, ctx: Context) -> None:
        # Both lists before any write: a missing list must change no mandate (design D1, D4).
        current = as_list(
            self._get(ctx, "senador/lista/atual")["ListaParlamentarEmExercicio"]["Parlamentares"][
                "Parlamentar"
            ]
        )
        off = as_list(
            (
                self._get(ctx, "senador/afastados")["AfastamentoAtual"].get("Parlamentares") or {}
            ).get("Parlamentar")
        )
        for item in current:
            ctx.enqueue("senator", _code(item), {"item": item})
        # A titular on temporary leave still holds the mandate: registered as licenciado, so
        # their amendments can be linked to them (change ingestao-emendas).
        listed = {_code(i) for i in current}
        for item in off:
            if _code(item) in listed or participation(item) != "titular":
                continue
            started_on = mandate_for(item).started_on
            if departure_for(item, started_on, today()).keep_open:
                ctx.enqueue("senator", _code(item), {"item": item, "licensed": True})
        self._not_in_office(ctx, listed, {_code(i): i for i in off})

    def _not_in_office(
        self, ctx: Context, current: set[str], off: dict[str, dict[str, Any]]
    ) -> None:
        open_mandates = ctx.db.execute(
            """
            select m.id, e.external_id, m.started_on
            from core.mandates m
            join core.politician_external_ids e
              on e.politician_id = m.politician_id and e.system = 'senado'
            where m.source = 'senado' and m.office = 'senador' and m.ended_on is null
            """
        ).fetchall()
        collected_on = today()
        for mandate_id, code, started_on in open_mandates:
            if code in current:
                continue
            result = departure_for(off.get(code), started_on, collected_on)
            if result.unknown_cause:
                log.warning("senado.unknown_cause", senator=code, cause=result.unknown_cause)
            if result.keep_open:
                ctx.db.execute(
                    "update core.mandates set status = %s, collected_at = now() where id = %s",
                    (result.status, mandate_id),
                )
                continue
            if result.approximate:
                log.warning("senado.approximate_end", senator=code, ended_on=str(result.ended_on))
            # An ended mandate is no longer "on leave": it was a titular's mandate that ended.
            ctx.db.execute(
                """
                update core.mandates set ended_on = %s, collected_at = now(),
                  status = case when status = 'licenciado' then 'titular' else status end
                where id = %s
                """,
                (result.ended_on, mandate_id),
            )

    def _senator(self, ctx: Context) -> None:
        item: dict[str, Any] = ctx.job.payload["item"]
        code = _code(item)
        detail: dict[str, Any] = self._get(ctx, f"senador/{code}")
        problems = validate_senator(item, detail)
        ctx.validate(not problems, "; ".join(problems))
        senator = normalize_senator(item, detail)
        uf_code = ctx.db.execute(
            "select ibge_code from core.localities where kind = 'uf' and uf_abbr = %s",
            (senator.uf,),
        ).fetchone()
        if uf_code is None:
            raise ValidationError(f"senador {code}: UF {senator.uf!r} não cadastrada")
        politician_id, own = self._politician(ctx.db, senator)
        history, warnings = affiliations(self._get(ctx, f"senador/{code}/filiacoes"))
        for warning in warnings:
            log.warning("senado.affiliation_dropped", senator=code, reason=warning)
        self._affiliations(ctx.db, politician_id, own, code, history)
        mandate = mandate_for(item)
        if ctx.job.payload.get("licensed"):
            mandate = replace(mandate, status="licenciado")
        self._mandate(ctx.db, politician_id, uf_code[0], senator, mandate)

    def _politician(self, db: psycopg.Connection, senator: Senator) -> tuple[int, bool]:
        """Returns (politician id, whether the record belongs to the Senate source)."""
        url = senator_url(senator.source_id)
        values = (senator.civil_name or senator.parliamentary_name,
                  senator.parliamentary_name or senator.civil_name,
                  senator.birth_date, senator.photo_url)  # fmt: skip
        known = db.execute(
            "select e.politician_id, p.source::text from core.politician_external_ids e "
            "join core.politicians p on p.id = e.politician_id "
            "where e.system = 'senado' and e.external_id = %s",
            (senator.source_id,),
        ).fetchone()
        if known:
            db.execute(
                """
                update core.politicians set civil_name = %s, parliamentary_name = %s,
                  birth_date = %s, photo_url = %s, collected_at = now()
                where id = %s and source = 'senado'
                """,
                (*values, known[0]),
            )
            return int(known[0]), known[1] == SOURCE
        politician_id = same_person(db, SOURCE, senator.civil_name, senator.birth_date)
        own = politician_id is None
        if politician_id is None:
            row = db.execute(
                """
                insert into core.politicians (civil_name, parliamentary_name, birth_date,
                  photo_url, source, source_id, source_url, collected_at)
                values (%s, %s, %s, %s, 'senado', %s, %s, now())
                on conflict (source, source_id) do update set
                  civil_name = excluded.civil_name,
                  parliamentary_name = excluded.parliamentary_name,
                  birth_date = excluded.birth_date, photo_url = excluded.photo_url,
                  collected_at = excluded.collected_at
                returning id
                """,
                (*values, senator.source_id, url),
            ).fetchone()
            if row is None:
                raise RuntimeError("insert returned no row")
            politician_id = int(row[0])
        db.execute(
            """
            insert into core.politician_external_ids (politician_id, system, external_id, source,
              source_id, source_url, collected_at)
            values (%s, 'senado', %s, 'senado', %s, %s, now())
            on conflict (system, external_id) do nothing
            """,
            (politician_id, senator.source_id, senator.source_id, url),
        )
        return politician_id, own

    def _party(self, db: psycopg.Connection, code: str, acronym: str, name: str) -> int:
        row = db.execute("select id from core.parties where acronym = %s", (acronym,)).fetchone()
        if row:
            return int(row[0])
        created = db.execute(
            """
            insert into core.parties (acronym, name, source, source_id, source_url, collected_at)
            values (%s, %s, 'senado', %s, %s, now())
            returning id
            """,
            (acronym, name, code, f"{API_BASE}/senador/partidos"),
        ).fetchone()
        if created is None:
            raise RuntimeError("insert returned no row")
        return int(created[0])

    def _affiliations(
        self,
        db: psycopg.Connection,
        politician_id: int,
        own: bool,
        code: str,
        history: list[Any],
    ) -> None:
        if not own:
            # Linked to a politician from another source: that source keeps the open
            # affiliation, so two sources never compete for it (design D5).
            other_open = db.execute(
                "select 1 from core.party_affiliations where politician_id = %s "
                "and ended_on is null and source <> 'senado'",
                (politician_id,),
            ).fetchone()
            if other_open:
                return
        url = f"{senator_url(code)}/filiacoes"
        # Closed rows first, so the single open affiliation is written last.
        for row in sorted(history, key=lambda a: (a.ended_on is None, a.started_on or date.min)):
            party_id = self._party(db, row.party_code, row.acronym, row.party_name)
            if row.ended_on is None:
                # Any other open Senate affiliation (an old party) ended when this one began.
                db.execute(
                    """
                    update core.party_affiliations
                    set ended_on = greatest(coalesce(started_on, %s::date), %s::date)
                    where politician_id = %s and source = 'senado' and ended_on is null
                      and source_id <> %s
                    """,
                    (row.started_on, row.started_on or today(), politician_id,
                     row.source_id(code)),
                )  # fmt: skip
            db.execute(
                """
                insert into core.party_affiliations (politician_id, party_id, started_on,
                  ended_on, source, source_id, source_url, collected_at)
                values (%s, %s, %s, %s, 'senado', %s, %s, now())
                on conflict (source, source_id) do update set
                  ended_on = excluded.ended_on, collected_at = excluded.collected_at
                """,
                (politician_id, party_id, row.started_on, row.ended_on, row.source_id(code), url),
            )

    def _mandate(
        self,
        db: psycopg.Connection,
        politician_id: int,
        uf_code: str,
        senator: Senator,
        mandate: Mandate,
    ) -> None:
        source_id = mandate.source_id(senator.source_id)
        db.execute(
            """
            update core.mandates set ended_on = greatest(started_on, %s::date)
            where politician_id = %s and source = 'senado' and office = 'senador'
              and ended_on is null and source_id <> %s
            """,
            (mandate.started_on - timedelta(days=1), politician_id, source_id),
        )
        db.execute(
            """
            insert into core.mandates (politician_id, house_id, office, locality_code,
              legislature, started_on, ended_on, status, source, source_id, source_url,
              collected_at)
            select %s, h.id, 'senador', %s, %s, %s, null, %s, 'senado', %s, %s, now()
            from core.legislative_houses h where h.slug = 'senado'
            on conflict (source, source_id) do update set
              locality_code = excluded.locality_code, status = excluded.status,
              ended_on = null, collected_at = excluded.collected_at
            """,
            (
                politician_id, uf_code, mandate.legislature, mandate.started_on, mandate.status,
                source_id, senator_url(senator.source_id),
            ),
        )  # fmt: skip
