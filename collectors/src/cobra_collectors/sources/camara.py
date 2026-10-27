"""Câmara dos Deputados adapter: federal deputies in office (openspec change
`ingestao-camara-deputados`, design D1 to D6) and plenary votes (`ingestao-camara-votacoes`)."""

from collections.abc import Iterable
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import psycopg
import structlog

from cobra_collectors.pipeline import Context, JobSpec, ValidationError
from cobra_collectors.sources.camara_model import (
    API_BASE,
    LEGISLATURE,
    Deputy,
    Mandate,
    cpf_dropped,
    departure_for,
    deputy_url,
    mandate_for,
    normalize_deputy,
    party_id_from_uri,
    validate_deputy,
)
from cobra_collectors.sources.camara_presenca import collect_attendance
from cobra_collectors.sources.camara_votacoes import collect_votes
from cobra_collectors.sources.camara_votacoes_model import FIRST_YEAR
from cobra_collectors.sources.despesas import collect_camara

SOURCE = "camara"
ELECTORAL_NUMBERS = range(10, 100)
log = structlog.get_logger()


def today() -> date:
    """Collection date in Brasília, where the Câmara's dates are."""
    return datetime.now(ZoneInfo("America/Sao_Paulo")).date()


def electoral_number(value: object) -> int | None:
    number = int(value) if isinstance(value, int | str) and str(value).isdigit() else None
    return number if number in ELECTORAL_NUMBERS else None


class CamaraSource:
    name = SOURCE
    rate_per_second = 2.0  # no documented limit; conservative (design D1)
    burst = 2

    def __init__(
        self,
        uf: str | None = None,
        page_size: int = 100,
        vote_years: Iterable[int] | None = None,
    ) -> None:
        # `uf` narrows the listing (tests); the real collection covers every state.
        self.uf = uf
        self.page_size = page_size
        # Years of plenary votes and quota expenses to collect; by default the legislature
        # up to this year.
        self.vote_years = (
            tuple(vote_years)
            if vote_years is not None
            else tuple(range(FIRST_YEAR, today().year + 1))
        )

    def plan(self) -> Iterable[JobSpec]:
        return [
            JobSpec("deputies-page", "p1", {"page": 1}),
            JobSpec("close-mandates", "run", {}),
            *(JobSpec("votes", str(year), {"year": year}) for year in self.vote_years),
            *(JobSpec("expenses", str(year), {"year": year}) for year in self.vote_years),
            *(JobSpec("attendance", str(year), {"year": year}) for year in self.vote_years),
        ]

    def handle(self, ctx: Context) -> None:
        kind = ctx.job.kind
        if kind == "deputies-page":
            self._page(ctx)
        elif kind == "deputy":
            self._deputy(ctx)
        elif kind == "close-mandates":
            self._close_mandates(ctx)
        elif kind == "votes":
            collect_votes(ctx, int(ctx.job.payload["year"]))
        elif kind == "expenses":
            collect_camara(ctx, int(ctx.job.payload["year"]))
        elif kind == "attendance":
            collect_attendance(ctx, int(ctx.job.payload["year"]))
        else:
            raise ValueError(f"unknown job kind {kind!r}")

    # -- helpers -----------------------------------------------------------------

    def _get(self, ctx: Context, path: str, params: dict[str, Any] | None = None) -> Any:
        response = ctx.fetch(f"{API_BASE}/{path}", params)
        response.raise_for_status()
        return response.json()

    def _list_page(self, ctx: Context, page: int) -> dict[str, Any]:
        params: dict[str, Any] = {
            "itens": self.page_size,
            "pagina": page,
            "ordem": "ASC",
            "ordenarPor": "id",
        }
        if self.uf:
            params["siglaUf"] = self.uf
        body: dict[str, Any] = self._get(ctx, "deputados", params)
        return body

    @staticmethod
    def _has_next(body: dict[str, Any]) -> bool:
        return any(link.get("rel") == "next" for link in body.get("links") or [])

    # -- jobs ----------------------------------------------------------------------

    def _page(self, ctx: Context) -> None:
        page = int(ctx.job.payload["page"])
        body = self._list_page(ctx, page)
        if self._has_next(body):
            ctx.enqueue("deputies-page", f"p{page + 1}", {"page": page + 1}, independent=True)
        for item in body["dados"]:
            payload = {"id": item["id"], "party_id": party_id_from_uri(item.get("uriPartido"))}
            ctx.enqueue("deputy", str(item["id"]), payload)

    def _deputy(self, ctx: Context) -> None:
        deputy_id = str(ctx.job.payload["id"])
        detail: dict[str, Any] = self._get(ctx, f"deputados/{deputy_id}")["dados"]
        problems = validate_deputy(detail)
        ctx.validate(not problems, "; ".join(problems))
        history: list[dict[str, Any]] = self._get(ctx, f"deputados/{deputy_id}/historico")["dados"]
        deputy = normalize_deputy(detail)
        if cpf_dropped(detail):
            log.warning("camara.cpf_dropped", deputy=deputy_id)

        uf_code = ctx.db.execute(
            "select ibge_code from core.localities where kind = 'uf' and uf_abbr = %s",
            (deputy.uf,),
        ).fetchone()
        if uf_code is None:
            raise ValidationError(f"deputado {deputy_id}: UF {deputy.uf!r} não cadastrada")

        politician_id = self._upsert_politician(ctx.db, deputy)
        if deputy.cpf:
            ctx.db.execute(
                """
                insert into restricted.politician_private_ids (politician_id, cpf, source,
                  source_id, source_url, collected_at)
                values (%s, %s, 'camara', %s, %s, now())
                on conflict (politician_id) do update set
                  cpf = excluded.cpf, collected_at = excluded.collected_at
                """,
                (politician_id, deputy.cpf, deputy_id, deputy_url(deputy_id)),
            )
        party_id = deputy.party_acronym and self._party(
            ctx,
            deputy.party_acronym,
            ctx.job.payload.get("party_id")
            or party_id_from_uri((detail.get("ultimoStatus") or {}).get("uriPartido")),
        )
        if party_id:
            self._affiliation(ctx.db, politician_id, party_id, deputy)
        self._mandate(ctx.db, politician_id, uf_code[0], deputy, mandate_for(deputy, history))

    def _upsert_politician(self, db: psycopg.Connection, deputy: Deputy) -> int:
        url = deputy_url(deputy.source_id)
        known = db.execute(
            "select politician_id from core.politician_external_ids "
            "where system = 'camara' and external_id = %s",
            (deputy.source_id,),
        ).fetchone()
        values = (
            deputy.civil_name or deputy.parliamentary_name,
            deputy.parliamentary_name or deputy.civil_name,
            deputy.birth_date,
            deputy.photo_url,
        )
        if known:
            # Fields shown by the site come from the Câmara only while it is the record's source.
            db.execute(
                """
                update core.politicians set civil_name = %s, parliamentary_name = %s,
                  birth_date = %s, photo_url = %s, collected_at = now()
                where id = %s and source = 'camara'
                """,
                (*values, known[0]),
            )
            return int(known[0])
        row = db.execute(
            """
            insert into core.politicians (civil_name, parliamentary_name, birth_date, photo_url,
              source, source_id, source_url, collected_at)
            values (%s, %s, %s, %s, 'camara', %s, %s, now())
            on conflict (source, source_id) do update set
              civil_name = excluded.civil_name, parliamentary_name = excluded.parliamentary_name,
              birth_date = excluded.birth_date, photo_url = excluded.photo_url,
              collected_at = excluded.collected_at
            returning id
            """,
            (*values, deputy.source_id, url),
        ).fetchone()
        if row is None:
            raise RuntimeError("insert returned no row")
        politician_id = int(row[0])
        db.execute(
            """
            insert into core.politician_external_ids (politician_id, system, external_id, source,
              source_id, source_url, collected_at)
            values (%s, 'camara', %s, 'camara', %s, %s, now())
            on conflict (system, external_id) do nothing
            """,
            (politician_id, deputy.source_id, deputy.source_id, url),
        )
        return politician_id

    def _party(self, ctx: Context, acronym: str, camara_party_id: str | None) -> int:
        row = ctx.db.execute(
            "select id from core.parties where acronym = %s", (acronym,)
        ).fetchone()
        if row:
            return int(row[0])
        if not camara_party_id:
            raise ValidationError(f"partido {acronym}: sem identificador na Câmara")
        party: dict[str, Any] = self._get(ctx, f"partidos/{camara_party_id}")["dados"]
        number = electoral_number(party.get("numeroEleitoral"))
        created = ctx.db.execute(
            """
            insert into core.parties (acronym, name, electoral_number, source, source_id,
              source_url, collected_at)
            values (%s, %s, %s, 'camara', %s, %s, now())
            returning id
            """,
            (
                acronym,
                party.get("nome") or acronym,
                number,
                camara_party_id,
                f"{API_BASE}/partidos/{camara_party_id}",
            ),
        ).fetchone()
        if created is None:
            raise RuntimeError("insert returned no row")
        return int(created[0])

    def _affiliation(
        self, db: psycopg.Connection, politician_id: int, party_id: int, deputy: Deputy
    ) -> None:
        current = db.execute(
            "select id, party_id, started_on from core.party_affiliations "
            "where politician_id = %s and ended_on is null",
            (politician_id,),
        ).fetchone()
        if current and current[1] == party_id:
            return
        changed_on = deputy.status_date or today()
        if current:
            # Party change (design D6): the old affiliation ends where the new one starts.
            ended_on = max(changed_on, current[2]) if current[2] else changed_on
            db.execute(
                "update core.party_affiliations set ended_on = %s where id = %s",
                (ended_on, current[0]),
            )
        # The first affiliation has no start: the Câmara does not inform it.
        started_on = changed_on if current else None
        db.execute(
            """
            insert into core.party_affiliations (politician_id, party_id, started_on, source,
              source_id, source_url, collected_at)
            values (%s, %s, %s, 'camara', %s, %s, now())
            on conflict (source, source_id) do update set
              ended_on = null, collected_at = excluded.collected_at
            """,
            (
                politician_id,
                party_id,
                started_on,
                f"{deputy.source_id}:{party_id}:{started_on or 'inicial'}",
                deputy_url(deputy.source_id),
            ),
        )

    def _mandate(
        self,
        db: psycopg.Connection,
        politician_id: int,
        uf_code: str,
        deputy: Deputy,
        mandate: Mandate,
    ) -> None:
        source_id = mandate.source_id(deputy.source_id)
        # Another open Câmara mandate (e.g. substitute made titular) ends the day before.
        db.execute(
            """
            update core.mandates set ended_on = greatest(started_on, %s::date)
            where politician_id = %s and source = 'camara' and office = 'deputado_federal'
              and ended_on is null and source_id <> %s
            """,
            (mandate.started_on - timedelta(days=1), politician_id, source_id),
        )
        db.execute(
            """
            insert into core.mandates (politician_id, house_id, office, locality_code,
              legislature, started_on, ended_on, status, source, source_id, source_url,
              collected_at)
            select %s, h.id, 'deputado_federal', %s, %s, %s, null, %s, 'camara', %s, %s, now()
            from core.legislative_houses h where h.slug = 'camara'
            on conflict (source, source_id) do update set
              locality_code = excluded.locality_code, status = excluded.status,
              ended_on = null, collected_at = excluded.collected_at
            """,
            (
                politician_id, uf_code, LEGISLATURE, mandate.started_on, mandate.status,
                source_id, deputy_url(deputy.source_id),
            ),
        )  # fmt: skip

    def _close_mandates(self, ctx: Context) -> None:
        """Mandates of deputies no longer in office (design D4). Any failed page fails the
        job before touching a mandate."""
        current: set[str] = set()
        page = 1
        while True:
            body = self._list_page(ctx, page)
            current.update(str(item["id"]) for item in body["dados"])
            if not self._has_next(body):
                break
            page += 1
        open_mandates = ctx.db.execute(
            """
            select m.id, e.external_id, m.started_on
            from core.mandates m
            join core.politician_external_ids e
              on e.politician_id = m.politician_id and e.system = 'camara'
            join core.localities l on l.ibge_code = m.locality_code
            where m.source = 'camara' and m.office = 'deputado_federal' and m.ended_on is null
              and (%s::text is null or l.uf_abbr = %s)
            """,
            (self.uf, self.uf),
        ).fetchall()
        collected_on = today()
        for mandate_id, deputy_id, started_on in open_mandates:
            if deputy_id in current:
                continue
            detail: dict[str, Any] = self._get(ctx, f"deputados/{deputy_id}")["dados"]
            result = departure_for(detail, started_on, collected_on)
            if result.keep_open:
                ctx.db.execute(
                    "update core.mandates set status = %s, collected_at = now() where id = %s",
                    (result.status, mandate_id),
                )
                continue
            if result.approximate:
                log.warning("camara.approximate_end", deputy=deputy_id, ended_on=str(collected_on))
            ctx.db.execute(
                "update core.mandates set ended_on = %s, collected_at = now() where id = %s",
                (result.ended_on, mandate_id),
            )
