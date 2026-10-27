"""TSE government plans adapter: the plan registered by each elected ticket in the pilot scope.
See design D1 to D5 of openspec change `ingestao-planos-de-governo`."""

import hashlib
import zipfile
from collections.abc import Iterable
from dataclasses import dataclass
from io import BytesIO

import psycopg

from cobra_collectors.pipeline import Context, JobSpec, ValidationError
from cobra_collectors.sources.tse_planos_model import (
    SCOPES,
    Page,
    Ticket,
    candidate_rows,
    candidates_url,
    elected_ticket,
    extract_pages,
    page_themes,
    pdf_name,
    plans_url,
)

# Registered as `tse`: the queue stores the source as a core.data_source value; other TSE
# datasets (change ingestao-tse) add job kinds to this adapter.
SOURCE = "tse"
ELECTION = 2022


@dataclass(frozen=True)
class PlanFile:
    year: int
    office: str
    uf_code: str | None
    scope: str
    ticket: Ticket
    pdf: bytes
    pages: int
    url: str


class TsePlanosSource:
    name = SOURCE
    rate_per_second = 1.0  # large public files
    burst = 1

    def plan(self) -> Iterable[JobSpec]:
        return [
            JobSpec("plans", f"{ELECTION}-{scope}", {"year": ELECTION, "scope": scope})
            for scope in SCOPES
        ]

    def handle(self, ctx: Context) -> None:
        if ctx.job.kind != "plans":
            raise ValueError(f"unknown job kind {ctx.job.kind!r}")
        year, scope = int(ctx.job.payload["year"]), ctx.job.payload["scope"]
        office, tse_office, uf_code = SCOPES[scope]
        ticket = self._ticket(ctx, year, scope, tse_office)
        url = plans_url(year, scope)
        archive = zipfile.ZipFile(BytesIO(self._download(ctx, url)))
        name = pdf_name(year, scope, ticket.candidate_id)
        if name not in archive.namelist():
            raise ValidationError(f"plano {name} não está no arquivo do TSE")
        pdf = archive.read(name)
        pages = extract_pages(pdf)
        ctx.validate(bool(pages), f"plano {name} sem páginas")
        plan = PlanFile(year, office, uf_code, scope, ticket, pdf, len(pages), url)
        plan_id = self._save_plan(ctx.db, plan)
        self._save_pages(ctx.db, plan_id, pages, url)

    def _download(self, ctx: Context, url: str) -> bytes:
        response = ctx.fetch(url)
        response.raise_for_status()
        return response.content

    def _ticket(self, ctx: Context, year: int, scope: str, tse_office: str) -> Ticket:
        archive = zipfile.ZipFile(BytesIO(self._download(ctx, candidates_url(year))))
        # Only the needed columns are kept from the file (design D5).
        rows = candidate_rows(archive.read(f"consulta_cand_{year}_{scope}.csv"))
        ticket = elected_ticket(rows, tse_office)
        if ticket is None:
            raise ValidationError(f"nenhum eleito único para {tse_office} em {scope} ({year})")
        return ticket

    @staticmethod
    def _save_plan(db: psycopg.Connection, plan: PlanFile) -> int:
        row = db.execute(
            """
            insert into core.government_plans (election_year, office, uf_code, holder_name,
              running_mate_name, party, tse_candidate_id, pdf, pdf_sha256, pdf_pages, source,
              source_id, source_url, collected_at)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'tse', %s, %s, now())
            on conflict (source, source_id) do update set
              holder_name = excluded.holder_name, running_mate_name = excluded.running_mate_name,
              party = excluded.party, tse_candidate_id = excluded.tse_candidate_id,
              pdf = excluded.pdf, pdf_sha256 = excluded.pdf_sha256,
              pdf_pages = excluded.pdf_pages, collected_at = excluded.collected_at
            returning id
            """,
            (
                plan.year, plan.office, plan.uf_code, plan.ticket.holder,
                plan.ticket.running_mate, plan.ticket.party, plan.ticket.candidate_id, plan.pdf,
                hashlib.sha256(plan.pdf).hexdigest(), plan.pages,
                f"{plan.year}-{plan.office}-{plan.scope}", plan.url,
            ),
        ).fetchone()  # fmt: skip
        if row is None:
            raise RuntimeError("insert returned no row")
        return int(row[0])

    @staticmethod
    def _save_pages(db: psycopg.Connection, plan_id: int, pages: list[Page], url: str) -> None:
        themes = {
            slug: list(keywords)
            for slug, keywords in db.execute("select slug, keywords from core.plan_themes")
        }
        db.execute("delete from core.government_plan_pages where plan_id = %s", (plan_id,))
        for page in pages:
            source_id = f"{plan_id}:{page.number}"
            db.execute(
                """
                insert into core.government_plan_pages (plan_id, page, text, has_text, source,
                  source_id, source_url, collected_at)
                values (%s, %s, %s, %s, 'tse', %s, %s, now())
                """,
                (plan_id, page.number, page.text, page.has_text, source_id, url),
            )
            for theme, hits in page_themes(page.text, themes).items():
                db.execute(
                    """
                    insert into core.plan_page_themes (plan_id, page, theme, hits, source,
                      source_id, source_url, collected_at)
                    values (%s, %s, %s, %s, 'cobra', %s, %s, now())
                    """,
                    (plan_id, page.number, theme, hits, f"{source_id}:{theme}", url),
                )
