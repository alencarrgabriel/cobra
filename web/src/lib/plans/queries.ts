import "server-only";

import { cacheLife } from "next/cache";

import { type DbResult, tryDb, unwrap } from "@/lib/db";
import type { WorkStatus } from "@/lib/works/filters";
import { PILOT_UF } from "@/lib/works/queries";

import { type PlanKey, parsePlanSlug, planSlug } from "./slug";

// Government plans for the site (change plano-de-governo, design D7). Only Cobra's own database.

export type PlanSummary = PlanKey & {
  id: number;
  slug: string;
  ufName: string | null;
  holder: string;
  runningMate: string | null;
  party: string | null;
  pages: number;
  sha256: string;
  sourceUrl: string | null;
  collectedAt: string;
};

export type PlanPage = {
  page: number;
  text: string;
  hasText: boolean;
  themes: string[];
};

export type PlanTheme = {
  slug: string;
  label: string;
  workTypes: string[];
  keywords: string[];
  pages: number;
};

export type Plan = PlanSummary & { pageTexts: PlanPage[]; themes: PlanTheme[] };

export type AreaWork = { code: string; name: string; status: WorkStatus };

const cache = (ok: boolean) => (ok ? cacheLife("hours") : cacheLife("seconds"));

type SummaryRow = {
  id: string;
  election_year: number;
  office: "presidente" | "governador";
  uf_abbr: string | null;
  uf_name: string | null;
  holder_name: string;
  running_mate_name: string | null;
  party: string | null;
  pdf_pages: number;
  pdf_sha256: string;
  source_url: string | null;
  collected: string;
};

const summary = (r: SummaryRow): PlanSummary => {
  const key = { year: r.election_year, office: r.office, uf: r.uf_abbr };
  return {
    ...key,
    id: Number(r.id),
    slug: planSlug(key),
    ufName: r.uf_name,
    holder: r.holder_name,
    runningMate: r.running_mate_name,
    party: r.party,
    pages: r.pdf_pages,
    sha256: r.pdf_sha256,
    sourceUrl: r.source_url,
    collectedAt: r.collected,
  };
};

const SUMMARY_COLUMNS = `
  p.id::text as id, p.election_year, p.office, l.uf_abbr, l.name as uf_name, p.holder_name,
  p.running_mate_name, p.party, p.pdf_pages, p.pdf_sha256, p.source_url,
  to_char(p.collected_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as collected`;

async function cachedPlans(): Promise<DbResult<PlanSummary[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<SummaryRow[]>`
      select ${sql.unsafe(SUMMARY_COLUMNS)}
      from core.government_plans p left join core.localities l on l.ibge_code = p.uf_code
      order by p.election_year desc, p.office desc, l.name nulls first`;
    return rows.map(summary);
  });
  cache(result.ok);
  return result;
}

export async function listPlans(): Promise<PlanSummary[]> {
  return unwrap(await cachedPlans());
}

async function cachedPlan(slug: string): Promise<DbResult<Plan | null>> {
  "use cache";
  const key = parsePlanSlug(slug);
  const result = await tryDb(async (sql) => {
    if (!key) return null;
    const [row] = await sql<SummaryRow[]>`
      select ${sql.unsafe(SUMMARY_COLUMNS)}
      from core.government_plans p left join core.localities l on l.ibge_code = p.uf_code
      where p.election_year = ${key.year} and p.office = ${key.office}
        and l.uf_abbr is not distinct from ${key.uf}`;
    if (!row) return null;
    const [pages, themes] = await Promise.all([
      sql<
        { page: number; text: string; has_text: boolean; themes: string[] }[]
      >`
        select g.page, g.text, g.has_text,
               coalesce(array_agg(t.theme order by t.theme) filter (where t.theme is not null),
                        '{}') as themes
        from core.government_plan_pages g
        left join core.plan_page_themes t on t.plan_id = g.plan_id and t.page = g.page
        where g.plan_id = ${row.id}
        group by g.page, g.text, g.has_text
        order by g.page`,
      sql<
        {
          slug: string;
          label: string;
          work_types: string[];
          keywords: string[];
          pages: string;
        }[]
      >`
        select t.slug, t.label, t.work_types, t.keywords, count(pt.page) as pages
        from core.plan_themes t
        left join core.plan_page_themes pt on pt.theme = t.slug and pt.plan_id = ${row.id}
        group by t.slug
        order by t.label`,
    ]);
    return {
      ...summary(row),
      pageTexts: pages.map((p) => ({
        page: p.page,
        text: p.text,
        hasText: p.has_text,
        themes: p.themes,
      })),
      themes: themes.map((t) => ({
        slug: t.slug,
        label: t.label,
        workTypes: t.work_types,
        keywords: t.keywords,
        pages: Number(t.pages),
      })),
    };
  });
  cache(result.ok);
  return result;
}

export async function getPlan(slug: string): Promise<Plan | null> {
  return unwrap(await cachedPlan(slug));
}

/** Pages that match the search through the Portuguese dictionary (design D3). */
async function cachedSearch(
  planId: number,
  query: string,
): Promise<DbResult<number[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<{ page: number }[]>`
      select page from core.government_plan_pages
      where plan_id = ${planId}
        and search @@ websearch_to_tsquery('portuguese', ${query})
      order by page`;
    return rows.map((r) => r.page);
  });
  cache(result.ok);
  return result;
}

export async function searchPages(
  planId: number,
  query: string,
): Promise<number[]> {
  return unwrap(await cachedSearch(planId, query));
}

async function cachedAreaWorks(
  types: string[],
): Promise<DbResult<{ works: AreaWork[]; total: number }>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    if (types.length === 0) return { works: [], total: 0 };
    const [works, [count]] = await Promise.all([
      sql<AreaWork[]>`
        select source_id as code, name, status::text as status from core.works
        where uf_code = ${PILOT_UF} and type = any(${types})
        order by name collate "und-x-icu" limit 8`,
      sql<{ total: string }[]>`
        select count(*) as total from core.works
        where uf_code = ${PILOT_UF} and type = any(${types})`,
    ]);
    return { works: [...works], total: Number(count?.total ?? 0) };
  });
  cache(result.ok);
  return result;
}

/** Works in the pilot UF of the given areas, alphabetical (design D4). */
export async function getAreaWorks(
  types: string[],
): Promise<{ works: AreaWork[]; total: number }> {
  return unwrap(await cachedAreaWorks(types));
}

/** The official PDF as stored, or null. Not cached here: the file is large (design D6). */
export async function getPlanPdf(slug: string): Promise<Uint8Array | null> {
  const key = parsePlanSlug(slug);
  if (!key) return null;
  const result = await tryDb(async (sql) => {
    const [row] = await sql<{ pdf: Uint8Array }[]>`
      select p.pdf from core.government_plans p
      left join core.localities l on l.ibge_code = p.uf_code
      where p.election_year = ${key.year} and p.office = ${key.office}
        and l.uf_abbr is not distinct from ${key.uf}`;
    return row?.pdf ?? null;
  });
  return unwrap(result);
}
