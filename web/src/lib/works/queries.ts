import "server-only";

import { cacheLife } from "next/cache";

import type postgres from "postgres";

import { type DbResult, tryDb, unwrap } from "@/lib/db";

import {
  PAGE_SIZE,
  slugify,
  WORK_STATUSES,
  type WorkOrder,
  type WorkStatus,
} from "./filters";

// Reads of the works pages (design D1, D2). Only Cobra's own database, never the source API.
// Each exported read calls a cached reader that returns plain objects, kept for hours; when the
// database is unavailable the reader returns that as a value kept for seconds, and the exported
// read throws DataUnavailableError outside the cache.

/** The pilot covers the Distrito Federal (IBGE code 53). */
export const PILOT_UF = "53";

export type Area = { type: string; slug: string; count: number };

export type WorksSummary = {
  total: number;
  plannedValue: number;
  byStatus: Record<WorkStatus, number>;
};

export type WorkListItem = {
  code: string;
  name: string;
  address: string | null;
  type: string | null;
  status: WorkStatus;
  plannedValue: number | null;
  progress: number | null;
  stoppedSince: string | null;
};

export type WorkPin = {
  code: string;
  name: string;
  status: WorkStatus;
  lat: number;
  lon: number;
};

export type Party = { name: string; cnpj: string | null };

export type WorkEvent = {
  status: string;
  occurredOn: string | null;
  justification: string | null;
  inNegotiation: boolean | null;
  negotiationPhase: string | null;
};

export type WorkDetail = WorkListItem & {
  description: string | null;
  socialFunction: string | null;
  nature: string | null;
  species: string | null;
  subtype: string | null;
  responsibleOrg: string | null;
  transferors: Party[];
  recipients: Party[];
  executors: Party[];
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  progressUpdatedOn: string | null;
  hasPhotos: boolean;
  hasLocation: boolean;
  qualityNotes: string[];
  events: WorkEvent[];
  sourceUrl: string | null;
  sourceUpdatedAt: string | null;
  collectedAt: string;
};

export type DataDates = {
  sourceUpdatedAt: string | null;
  collectedAt: string | null;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getAreas(uf: string): Promise<Area[]> {
  return unwrap(await cachedAreas(uf));
}

async function cachedAreas(uf: string): Promise<DbResult<Area[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<{ type: string; count: string }[]>`
      select type, count(*) as count from core.works
      where uf_code = ${uf} and type is not null and type <> ''
      group by type order by type`;
    return rows.map((r) => ({
      type: r.type,
      slug: slugify(r.type),
      count: Number(r.count),
    }));
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export async function getSummary(uf: string): Promise<WorksSummary> {
  return unwrap(await cachedSummary(uf));
}

async function cachedSummary(uf: string): Promise<DbResult<WorksSummary>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<
      { status: WorkStatus; count: string; value: string | null }[]
    >`
      select status, count(*) as count, sum(planned_value) as value
      from core.works where uf_code = ${uf} group by status`;
    const byStatus = Object.fromEntries(
      WORK_STATUSES.map((s) => [s, 0]),
    ) as Record<WorkStatus, number>;
    let total = 0;
    let plannedValue = 0;
    for (const r of rows) {
      byStatus[r.status] = Number(r.count);
      total += Number(r.count);
      plannedValue += Number(r.value ?? 0);
    }
    return { total, plannedValue, byStatus };
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export type ListQuery = {
  uf: string;
  status: WorkStatus | null;
  /** Work type as stored (already resolved from the URL slug). */
  type: string | null;
  order: WorkOrder;
  page: number;
};

export async function getWorkList(
  q: ListQuery,
): Promise<{ total: number; items: WorkListItem[] }> {
  return unwrap(await cachedWorkList(q));
}

async function cachedWorkList(
  q: ListQuery,
): Promise<DbResult<{ total: number; items: WorkListItem[] }>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const where = sql`
      w.uf_code = ${q.uf}
      ${q.status ? sql`and w.status = ${q.status}` : sql``}
      ${q.type ? sql`and w.type = ${q.type}` : sql``}`;
    const order =
      q.order === "nome"
        ? sql`w.name, w.id`
        : sql`w.planned_value desc nulls last, w.name, w.id`;
    const [{ count }] = await sql<{ count: string }[]>`
      select count(*) as count from core.works w where ${where}`;
    const rows = await sql`
      select w.source_id, w.name, w.address, w.type, w.status, w.planned_value,
             w.physical_progress, ${stoppedSince(sql)} as stopped_since
      from core.works w where ${where}
      order by ${order}
      limit ${PAGE_SIZE} offset ${(q.page - 1) * PAGE_SIZE}`;
    return { total: Number(count), items: rows.map(toListItem) };
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export async function getPins(
  q: Pick<ListQuery, "uf" | "status" | "type">,
): Promise<{ pins: WorkPin[]; withoutLocation: number }> {
  return unwrap(await cachedPins(q));
}

async function cachedPins(
  q: Pick<ListQuery, "uf" | "status" | "type">,
): Promise<DbResult<{ pins: WorkPin[]; withoutLocation: number }>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<
      {
        source_id: string;
        name: string;
        status: WorkStatus;
        latitude: string | null;
        longitude: string | null;
      }[]
    >`
      select source_id, name, status, latitude, longitude from core.works
      where uf_code = ${q.uf}
      ${q.status ? sql`and status = ${q.status}` : sql``}
      ${q.type ? sql`and type = ${q.type}` : sql``}
      order by id`;
    const pins: WorkPin[] = [];
    let withoutLocation = 0;
    for (const r of rows) {
      if (r.latitude === null || r.longitude === null) {
        withoutLocation += 1;
      } else {
        pins.push({
          code: r.source_id,
          name: r.name,
          status: r.status,
          lat: Number(r.latitude),
          lon: Number(r.longitude),
        });
      }
    }
    return { pins, withoutLocation };
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export async function getWork(code: string): Promise<WorkDetail | null> {
  return unwrap(await cachedWork(code));
}

async function cachedWork(code: string): Promise<DbResult<WorkDetail | null>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const [w] = await sql`
      select w.*, w.planned_start::text as planned_start_text,
             w.planned_end::text as planned_end_text,
             w.actual_start::text as actual_start_text,
             w.actual_end::text as actual_end_text,
             w.progress_updated_on::text as progress_updated_text,
             w.source_updated_at::text as source_updated_text,
             to_char(w.collected_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')
               as collected_text,
             ${stoppedSince(sql)} as stopped_since
      from core.works w
      where w.source = 'obrasgov' and w.source_id = ${code}`;
    if (!w) return null;
    const events = await sql`
      select status, occurred_on::text as occurred_on, justification,
             in_negotiation, negotiation_phase
      from core.work_status_events where work_id = ${w.id}
      order by occurred_on desc nulls last, id desc`;
    return {
      ...toListItem(w),
      description: w.description,
      socialFunction: w.social_function,
      nature: w.nature,
      species: w.species,
      subtype: w.subtype,
      responsibleOrg: w.responsible_org,
      transferors: w.transferors,
      recipients: w.recipients,
      executors: w.executors,
      plannedStart: w.planned_start_text,
      plannedEnd: w.planned_end_text,
      actualStart: w.actual_start_text,
      actualEnd: w.actual_end_text,
      progressUpdatedOn: w.progress_updated_text,
      hasPhotos: w.has_photos,
      hasLocation: w.latitude !== null && w.longitude !== null,
      qualityNotes: w.quality_notes,
      events: events.map((e) => ({
        status: e.status,
        occurredOn: e.occurred_on,
        justification: e.justification,
        inNegotiation: e.in_negotiation,
        negotiationPhase: e.negotiation_phase,
      })),
      sourceUrl: w.source_url,
      sourceUpdatedAt: w.source_updated_text,
      collectedAt: w.collected_text,
    };
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export async function getDataDates(uf: string): Promise<DataDates> {
  return unwrap(await cachedDataDates(uf));
}

async function cachedDataDates(uf: string): Promise<DbResult<DataDates>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const [r] = await sql<
      { updated: string | null; collected: string | null }[]
    >`
      select max(source_updated_at)::text as updated,
             to_char(max(collected_at) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')
               as collected
      from core.works where uf_code = ${uf}`;
    return { sourceUpdatedAt: r.updated, collectedAt: r.collected };
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

// Date of the latest stoppage event of a stopped or unfinished work (design D6).
function stoppedSince(sql: postgres.Sql) {
  return sql`(
    select max(e.occurred_on)::text from core.work_status_events e
    where e.work_id = w.id and w.status in ('stopped', 'unfinished')
      and e.status ilike 'paralisada%'
  )`;
}

function toListItem(r: Record<string, unknown>): WorkListItem {
  return {
    code: r.source_id as string,
    name: r.name as string,
    address: (r.address as string | null) ?? null,
    type: (r.type as string | null) ?? null,
    status: r.status as WorkStatus,
    plannedValue: num(r.planned_value),
    progress: num(r.physical_progress),
    stoppedSince: (r.stopped_since as string | null) ?? null,
  };
}
