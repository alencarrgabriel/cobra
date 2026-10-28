import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { type DbResult, tryDb, unwrap } from "@/lib/db";

import type { Ballot } from "./options";

// Feed and vote page (change feed-e-pagina-votacao). Only Cobra's own database.

const cache = (ok: boolean) => (ok ? cacheLife("hours") : cacheLife("seconds"));

export const PAGE_SIZE = 20;

export type VoteSummary = {
  id: number;
  kind: "votacao_relevante" | "votacao_simbolica";
  occurredOn: string;
  house: string;
  label: string | null;
  propositionSummary: string | null;
  propositionUrl: string | null;
  propositionType: string | null;
  description: string;
  approved: boolean | null;
  yes: number;
  no: number;
  other: number;
  nominal: boolean;
  secret: boolean;
  ballotsChecked: boolean;
  criteria: string[];
  summary: { text: string; approvedAt: string; aiModel: string | null } | null;
  collectedAt: string;
};

type Row = {
  id: string;
  kind: VoteSummary["kind"];
  occurred_on: string;
  house: string;
  label: string | null;
  proposition_summary: string | null;
  proposition_url: string | null;
  proposition_type: string | null;
  description: string;
  approved: boolean | null;
  yes: number;
  no: number;
  other: number;
  nominal: boolean;
  secret: boolean;
  quality_notes: string[];
  criteria: string[] | null;
  summary_text: string | null;
  summary_approved: string | null;
  summary_ai: string | null;
  collected: string;
};

const COLUMNS = `
  v.id::text, v.occurred_on::text, h.slug as house, v.proposition_label as label,
  v.proposition_summary, v.proposition_url, v.proposition_type, v.description, v.approved,
  v.yes, v.no, v.other, v.nominal, v.secret, v.quality_notes,
  ps.text as summary_text, ps.approved_at::text as summary_approved, ps.ai_model as summary_ai,
  to_char(v.collected_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as collected`;

function toSummary(r: Row): VoteSummary {
  return {
    id: Number(r.id),
    kind: r.kind,
    occurredOn: r.occurred_on,
    house: r.house,
    label: r.label,
    propositionSummary: r.proposition_summary,
    propositionUrl: r.proposition_url,
    propositionType: r.proposition_type,
    description: r.description,
    approved: r.approved,
    yes: r.yes,
    no: r.no,
    other: r.other,
    nominal: r.nominal,
    secret: r.secret,
    // A vote whose ballots did not match the official count has no ballots to show.
    ballotsChecked: r.quality_notes.length === 0,
    criteria: r.criteria ?? [],
    summary:
      r.summary_text && r.summary_approved
        ? {
            text: r.summary_text,
            approvedAt: r.summary_approved,
            aiModel: r.summary_ai,
          }
        : null,
    collectedAt: r.collected,
  };
}

async function cachedFeed(
  house: string | null,
  page: number,
): Promise<DbResult<{ items: VoteSummary[]; more: boolean }>> {
  "use cache";
  cacheTag("summaries");
  const result = await tryDb(async (sql) => {
    const rows = await sql<Row[]>`
      select e.kind, e.criteria, ${sql.unsafe(COLUMNS)}
      from core.events e
      join core.votes v on v.id = e.vote_id
      join core.legislative_houses h on h.id = v.house_id
      left join core.published_summaries ps on ps.vote_id = v.id
      where ${house ? sql`h.slug = ${house}` : sql`true`}
      order by v.occurred_on desc, v.registered_at desc nulls last, v.id desc
      limit ${PAGE_SIZE + 1} offset ${(page - 1) * PAGE_SIZE}`;
    return {
      items: rows.slice(0, PAGE_SIZE).map(toSummary),
      more: rows.length > PAGE_SIZE,
    };
  });
  cache(result.ok);
  return result;
}

export async function getFeed(
  house: string | null,
  page: number,
): Promise<{ items: VoteSummary[]; more: boolean }> {
  return unwrap(await cachedFeed(house, page));
}

export type RepresentativeVote = {
  voteId: number;
  politicianId: number;
  name: string;
  party: string | null;
  option: string | null;
  detail: string | null;
};

async function cachedPlaceVotes(
  ufCode: string,
  voteIds: number[],
): Promise<DbResult<RepresentativeVote[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    if (voteIds.length === 0) return [];
    // Members of the UF in office on the vote's date (design D2).
    const rows = await sql<
      {
        vote_id: string;
        politician_id: string;
        name: string;
        party: string | null;
        option: string | null;
        detail: string | null;
      }[]
    >`
      select distinct on (v.id, p.parliamentary_name collate "und-x-icu", p.id)
             v.id::text as vote_id, p.id::text as politician_id,
             p.parliamentary_name as name, b.party_acronym as party,
             b.option, b.option_detail as detail
      from core.votes v
      join core.legislative_houses h on h.id = v.house_id
      join core.mandates m
        on m.house_id = v.house_id and m.locality_code = ${ufCode}
       and m.started_on <= v.occurred_on
       and (m.ended_on is null or m.ended_on >= v.occurred_on)
      join core.politicians p on p.id = m.politician_id
      left join core.vote_ballots b on b.vote_id = v.id and b.politician_id = p.id
      where v.id = any(${voteIds}) and v.nominal and v.quality_notes = '{}'
        and h.slug in ('camara', 'senado')
      order by v.id, p.parliamentary_name collate "und-x-icu", p.id`;
    return rows.map((r) => ({
      voteId: Number(r.vote_id),
      politicianId: Number(r.politician_id),
      name: r.name,
      party: r.party,
      option: r.option,
      detail: r.detail,
    }));
  });
  cache(result.ok);
  return result;
}

/** How the representatives of a UF voted in each of the given votes. */
export async function getPlaceVotes(
  ufCode: string,
  voteIds: number[],
): Promise<RepresentativeVote[]> {
  return unwrap(await cachedPlaceVotes(ufCode, voteIds));
}

export type VoteDetail = VoteSummary & {
  orientations: { bench: string; orientation: string }[];
  ballots: (Ballot & { politicianId: number | null; detail: string | null })[];
};

async function cachedVote(id: number): Promise<DbResult<VoteDetail | null>> {
  "use cache";
  cacheTag("summaries");
  const result = await tryDb(async (sql) => {
    const [row] = await sql<Row[]>`
      select case when v.nominal then 'votacao_relevante' else 'votacao_simbolica' end as kind,
             r.criteria, ${sql.unsafe(COLUMNS)}
      from core.votes v
      join core.legislative_houses h on h.id = v.house_id
      left join core.vote_relevance r on r.vote_id = v.id
      left join core.published_summaries ps on ps.vote_id = v.id
      where v.id = ${id}`;
    if (!row) return null;
    const [orientations, ballots] = await Promise.all([
      sql<{ bench: string; orientation: string }[]>`
        select bench, orientation from core.vote_orientations
        where vote_id = ${id} order by bench collate "und-x-icu"`,
      sql<
        {
          name: string;
          party: string | null;
          uf: string | null;
          option: string;
          detail: string | null;
          politician_id: string | null;
        }[]
      >`
        select name, party_acronym as party, uf, option, option_detail as detail,
               politician_id::text
        from core.vote_ballots where vote_id = ${id}
        order by name collate "und-x-icu", external_id`,
    ]);
    return {
      ...toSummary(row),
      orientations: [...orientations],
      ballots: ballots.map((b) => ({
        name: b.name,
        party: b.party,
        uf: b.uf,
        option: b.option,
        detail: b.detail,
        politicianId: b.politician_id === null ? null : Number(b.politician_id),
      })),
    };
  });
  cache(result.ok);
  return result;
}

export async function getVote(id: number): Promise<VoteDetail | null> {
  return unwrap(await cachedVote(id));
}
