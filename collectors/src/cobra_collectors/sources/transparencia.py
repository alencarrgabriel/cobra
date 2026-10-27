"""Portal da Transparência adapter: parliamentary amendments to the DF, from the public bulk
download (no API key). See design D1 to D3 of openspec change `ingestao-emendas`."""

import zipfile
from collections.abc import Iterable
from io import BytesIO

import psycopg
import structlog

from cobra_collectors.pipeline import Context, JobSpec
from cobra_collectors.sources.senado_model import normalize_name
from cobra_collectors.sources.transparencia_model import (
    DOWNLOAD_URL,
    MAIN_FILE,
    PAGE_URL,
    Amendment,
    author_kind,
    read_df,
    rows,
)

SOURCE = "transparencia"
log = structlog.get_logger()


class TransparenciaSource:
    name = SOURCE
    rate_per_second = 1.0  # one file per run
    burst = 1

    def plan(self) -> Iterable[JobSpec]:
        return [JobSpec("amendments", "run", {})]

    def handle(self, ctx: Context) -> None:
        if ctx.job.kind != "amendments":
            raise ValueError(f"unknown job kind {ctx.job.kind!r}")
        response = ctx.fetch(DOWNLOAD_URL)
        response.raise_for_status()
        # Amendments cited by commitments of DF works are kept whatever their destination.
        cited = frozenset(
            r[0]
            for r in ctx.db.execute(
                "select distinct amendment_code from core.work_commitments "
                "where amendment_code is not null"
            ).fetchall()
        )
        with zipfile.ZipFile(BytesIO(response.content)) as archive:
            reading = read_df(rows(archive.read(MAIN_FILE)), cited)
        ctx.validate(bool(reading.amendments), "nenhuma emenda com destino ao DF no arquivo")
        if reading.without_code:
            log.info("transparencia.rows_without_code", rows=reading.without_code)
        for unknown in sorted(reading.unknown_types):
            log.warning("transparencia.unknown_type", type=unknown)
        politicians = self._federal_politicians(ctx.db)
        authors: dict[str, int] = {}
        for amendment in reading.amendments.values():
            key = amendment.author_code
            if key not in authors:
                authors[key] = self._author(ctx.db, amendment, politicians)
            self._amendment(ctx.db, amendment, authors[key])

    @staticmethod
    def _federal_politicians(db: psycopg.Connection) -> dict[str, list[int]]:
        """Normalized parliamentary name → ids of federal deputies and senators (design D3)."""
        found: dict[str, list[int]] = {}
        for politician_id, name in db.execute(
            """
            select distinct p.id, p.parliamentary_name from core.politicians p
            join core.mandates m on m.politician_id = p.id
            where m.office in ('deputado_federal', 'senador')
            """
        ).fetchall():
            found.setdefault(normalize_name(name), []).append(int(politician_id))
        return found

    def _author(
        self, db: psycopg.Connection, amendment: Amendment, politicians: dict[str, list[int]]
    ) -> int:
        kind = author_kind(amendment.type) or "individual"
        politician_id = None
        if kind == "individual":
            matches = politicians.get(normalize_name(amendment.author_name), [])
            if len(matches) == 1:
                politician_id = matches[0]
            else:
                log.info(
                    "transparencia.author_unlinked",
                    author=amendment.author_name,
                    candidates=len(matches),
                )
        row = db.execute(
            """
            insert into core.amendment_authors (name, kind, politician_id, source, source_id,
              source_url, collected_at)
            values (%s, %s, %s, 'transparencia', %s, %s, now())
            on conflict (source, source_id) do update set
              name = excluded.name, kind = excluded.kind, politician_id = excluded.politician_id,
              collected_at = excluded.collected_at
            returning id
            """,
            (amendment.author_name, kind, politician_id, amendment.author_code, PAGE_URL),
        ).fetchone()
        if row is None:
            raise RuntimeError("insert returned no row")
        return int(row[0])

    @staticmethod
    def _amendment(db: psycopg.Connection, a: Amendment, author_id: int) -> None:
        db.execute(
            """
            insert into core.amendments (year, number, type, author_id, locality, uf_code,
              municipality_code, main_function, functions, committed, liquidated, paid, rp_paid,
              source, source_id, source_url, collected_at)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'transparencia', %s,
                    %s, now())
            on conflict (source, source_id) do update set
              type = excluded.type, author_id = excluded.author_id, locality = excluded.locality,
              uf_code = excluded.uf_code,
              municipality_code = excluded.municipality_code,
              main_function = excluded.main_function, functions = excluded.functions,
              committed = excluded.committed, liquidated = excluded.liquidated,
              paid = excluded.paid, rp_paid = excluded.rp_paid,
              collected_at = excluded.collected_at
            """,
            (
                a.year, a.number, a.type, author_id, a.locality, a.uf_code, a.municipality_code,
                a.main_function, a.functions, a.committed, a.liquidated, a.paid, a.rp_paid,
                a.code, f"{PAGE_URL}?codigoEmenda={a.code}",
            ),
        )  # fmt: skip
