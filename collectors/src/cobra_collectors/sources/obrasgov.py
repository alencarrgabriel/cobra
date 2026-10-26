"""Obrasgov.br adapter: federal-funded works of a state (DF in the pilot). See design D2 to D4."""

from collections.abc import Iterable
from datetime import datetime
from typing import Any

from psycopg.types.json import Jsonb

from cobra_collectors.pipeline import Context, JobSpec, ValidationError
from cobra_collectors.sources.obrasgov_model import (
    API_BASE,
    latest_progress,
    normalize_events,
    normalize_progress,
    normalize_work,
    validate_progress,
    validate_work,
    work_url,
)

PAGE_SIZE = 200
SOURCE = "obrasgov"


class ObrasgovSource:
    name = SOURCE
    rate_per_second = 2.0  # no documented limit; conservative (design D5)
    burst = 2

    def __init__(self, uf: str = "DF") -> None:
        self.uf = uf
        self._base_date: datetime | None = None

    def plan(self) -> Iterable[JobSpec]:
        return [
            JobSpec("projects", f"{self.uf}-p1", {"uf": self.uf, "page": 1}),
            JobSpec("geometry", f"{self.uf}-p1", {"uf": self.uf, "page": 1}),
        ]

    def handle(self, ctx: Context) -> None:
        kind = ctx.job.kind
        if kind == "projects":
            self._projects(ctx)
        elif kind == "detail":
            self._detail(ctx)
        elif kind == "geometry":
            self._geometry(ctx)
        else:
            raise ValueError(f"unknown job kind {kind!r}")

    # -- helpers -----------------------------------------------------------------

    def base_date(self, ctx: Context) -> datetime | None:
        """Last update of the Obrasgov base, fetched once per run."""
        if self._base_date is None:
            response = ctx.fetch(f"{API_BASE}/data-atualizacao")
            response.raise_for_status()
            value = response.json().get("data_ultima_atualizacao")
            self._base_date = datetime.fromisoformat(value) if value else None
        return self._base_date

    def _get_page(self, ctx: Context, path: str, params: dict[str, Any]) -> dict[str, Any]:
        response = ctx.fetch(f"{API_BASE}/{path}", {**params, "tamanho_da_pagina": PAGE_SIZE})
        response.raise_for_status()
        body: dict[str, Any] = response.json()
        return body

    def _next_page(self, ctx: Context, body: dict[str, Any], kind: str) -> None:
        """Queues the next page right away, so a page that fails validation does not stop
        the listing (design D4)."""
        page = int(body["page_number"])
        if page < int(body["total_pages"]):
            payload = {"uf": self.uf, "page": page + 1}
            ctx.enqueue(kind, f"{self.uf}-p{page + 1}", payload, independent=True)

    # -- jobs ----------------------------------------------------------------------

    def _projects(self, ctx: Context) -> None:
        uf, page = ctx.job.payload["uf"], ctx.job.payload["page"]
        body = self._get_page(ctx, "projeto-investimento", {"uf_principal": uf, "pagina": page})
        self._next_page(ctx, body, "projects")
        items = body["data"]
        problems = [p for item in items for p in validate_work(item, uf)]
        ctx.validate(not problems, "; ".join(problems[:5]))
        updated_at = self.base_date(ctx)
        uf_code = ctx.db.execute(
            "select ibge_code from core.localities where kind = 'uf' and uf_abbr = %s", (uf,)
        ).fetchone()
        if uf_code is None:
            raise ValidationError(f"UF {uf} não cadastrada")
        for item in items:
            work = normalize_work(item)
            ctx.db.execute(
                """
                insert into core.works (
                  name, description, social_function, address, postal_code, nature, species,
                  axis, type, subtype, status, uf_code, responsible_org, transferors, recipients,
                  executors, planned_value, planned_start, planned_end, actual_start, actual_end,
                  latitude, longitude, has_photos, registered_on, quality_notes,
                  source, source_id, source_url, collected_at, source_updated_at)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, 'obrasgov', %s, %s, now(), %s)
                on conflict (source, source_id) do update set
                  name = excluded.name, quality_notes = excluded.quality_notes,
                  description = excluded.description,
                  social_function = excluded.social_function, address = excluded.address,
                  postal_code = excluded.postal_code, nature = excluded.nature,
                  species = excluded.species, axis = excluded.axis, type = excluded.type,
                  subtype = excluded.subtype, status = excluded.status, uf_code = excluded.uf_code,
                  responsible_org = excluded.responsible_org, transferors = excluded.transferors,
                  recipients = excluded.recipients, executors = excluded.executors,
                  planned_value = excluded.planned_value, planned_start = excluded.planned_start,
                  planned_end = excluded.planned_end, actual_start = excluded.actual_start,
                  actual_end = excluded.actual_end, latitude = excluded.latitude,
                  longitude = excluded.longitude, has_photos = excluded.has_photos,
                  registered_on = excluded.registered_on, source_url = excluded.source_url,
                  collected_at = excluded.collected_at,
                  source_updated_at = excluded.source_updated_at
                """,
                (
                    work.name, work.description, work.social_function, work.address,
                    work.postal_code, work.nature, work.species, work.axis, work.type,
                    work.subtype, work.status, uf_code[0], work.responsible_org,
                    Jsonb(work.transferors), Jsonb(work.recipients), Jsonb(work.executors),
                    work.planned_value, work.planned_start, work.planned_end, work.actual_start,
                    work.actual_end, work.latitude, work.longitude, work.has_photos,
                    work.registered_on, list(work.quality_notes), work.source_id,
                    work_url(work.source_id), updated_at,
                ),
            )  # fmt: skip
            # Details only exist once the work is published (design D3).
            ctx.enqueue("detail", work.source_id, {"id": work.source_id})

    def _all_pages(self, ctx: Context, path: str, source_id: str) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        page = 1
        while True:
            body = self._get_page(ctx, path, {"id_projeto_investimento": source_id, "pagina": page})
            rows.extend(body["data"])
            if page >= int(body["total_pages"]):
                return rows
            page += 1

    def _detail(self, ctx: Context) -> None:
        source_id = ctx.job.payload["id"]
        row = ctx.db.execute(
            "select id from core.works where source = 'obrasgov' and source_id = %s", (source_id,)
        ).fetchone()
        if row is None:
            raise ValidationError(f"obra {source_id} ainda não publicada")
        work_id = int(row[0])
        updated_at = self.base_date(ctx)
        url = work_url(source_id)

        progress = normalize_progress(self._all_pages(ctx, "execucao-fisica", source_id))
        problems = validate_progress(source_id, progress)
        ctx.validate(not problems, "; ".join(problems))
        for p in progress:
            ctx.db.execute(
                """
                insert into core.work_progress (work_id, percent, started_on, ended_on, updated_on,
                  source, source_id, source_url, collected_at, source_updated_at)
                values (%s, %s, %s, %s, %s, 'obrasgov', %s, %s, now(), %s)
                on conflict (source, source_id) do update set
                  percent = excluded.percent, started_on = excluded.started_on,
                  ended_on = excluded.ended_on, updated_on = excluded.updated_on,
                  collected_at = excluded.collected_at,
                  source_updated_at = excluded.source_updated_at
                """,
                (
                    work_id,
                    p.percent,
                    p.started_on,
                    p.ended_on,
                    p.updated_on,
                    p.source_id,
                    url,
                    updated_at,
                ),
            )
        latest = latest_progress(progress)
        ctx.db.execute(
            "update core.works set physical_progress = %s, progress_updated_on = %s where id = %s",
            (latest.percent if latest else None, latest.updated_on if latest else None, work_id),
        )

        events = normalize_events(
            self._all_pages(ctx, "historico-situacao-cancelada-paralisada", source_id)
        )
        for e in events:
            ctx.db.execute(
                """
                insert into core.work_status_events (work_id, status, occurred_on, justification,
                  in_negotiation, negotiation_phase, source, source_id, source_url, collected_at,
                  source_updated_at)
                values (%s, %s, %s, %s, %s, %s, 'obrasgov', %s, %s, now(), %s)
                on conflict (work_id, status, occurred_on, justification) do update set
                  in_negotiation = excluded.in_negotiation,
                  negotiation_phase = excluded.negotiation_phase,
                  collected_at = excluded.collected_at,
                  source_updated_at = excluded.source_updated_at
                """,
                (
                    work_id, e.status, e.occurred_on, e.justification, e.in_negotiation,
                    e.negotiation_phase, e.source_id, url, updated_at,
                ),
            )  # fmt: skip

    def _geometry(self, ctx: Context) -> None:
        uf, page = ctx.job.payload["uf"], ctx.job.payload["page"]
        body = self._get_page(ctx, "geometria", {"sg_uf": uf, "pagina": page})
        self._next_page(ctx, body, "geometry")
        updated_at = self.base_date(ctx)
        for item in body["data"]:
            if item.get("cod_ibge") is None:
                continue
            # Works not collected yet, or municipalities not loaded yet, are linked on a later run.
            ctx.db.execute(
                """
                insert into core.work_localities (work_id, locality_code, source, source_id,
                  source_url, collected_at, source_updated_at)
                select w.id, l.ibge_code, 'obrasgov', %s, %s, now(), %s
                from core.works w join core.localities l on l.ibge_code = %s
                where w.source = 'obrasgov' and w.source_id = %s
                on conflict (work_id, locality_code) do update set
                  collected_at = excluded.collected_at,
                  source_updated_at = excluded.source_updated_at
                """,
                (
                    str(item["id_geometria"]), work_url(item["id_projeto_investimento"]),
                    updated_at, str(item["cod_ibge"]), item["id_projeto_investimento"],
                ),
            )  # fmt: skip
