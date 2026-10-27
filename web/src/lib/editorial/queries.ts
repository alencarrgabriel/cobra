import "server-only";

import { editorDb } from "./db";

// Reads of the editorial panel (change painel-editorial, design D3). Not cached: editors must
// see what they just saved.

export type QueueItem = {
  id: number;
  occurredOn: string;
  house: string;
  label: string | null;
  type: string | null;
  description: string;
  criteria: string[];
  hasDraft: boolean;
};

/** Relevant votes of both houses without a published summary, most recent first. */
export async function queue(limit = 50): Promise<QueueItem[]> {
  const rows = await editorDb()<
    {
      id: string;
      occurred_on: string;
      house: string;
      label: string | null;
      type: string | null;
      description: string;
      criteria: string[];
      has_draft: boolean;
    }[]
  >`
    select v.id::text, v.occurred_on::text, h.slug as house, v.proposition_label as label,
           v.proposition_type as type, v.description, r.criteria,
           exists (select 1 from editorial.vote_summaries s where s.vote_id = v.id) as has_draft
    from core.vote_relevance r
    join core.votes v on v.id = r.vote_id
    join core.legislative_houses h on h.id = v.house_id
    where cardinality(r.criteria) > 0
      and not exists (select 1 from editorial.vote_summaries s
                      where s.vote_id = v.id and s.status = 'publicado')
    order by v.occurred_on desc, v.id desc
    limit ${limit}`;
  return rows.map((r) => ({
    id: Number(r.id),
    occurredOn: r.occurred_on,
    house: r.house,
    label: r.label,
    type: r.type,
    description: r.description,
    criteria: r.criteria,
    hasDraft: r.has_draft,
  }));
}

export type Version = {
  version: number;
  text: string;
  status: string;
  author: string;
  aiModel: string | null;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

export type VoteForEditing = {
  id: number;
  occurredOn: string;
  house: string;
  description: string;
  approved: boolean | null;
  yes: number;
  no: number;
  other: number;
  label: string | null;
  summary: string | null;
  propositionUrl: string | null;
  sourceUrl: string | null;
  criteria: string[];
  orientations: { bench: string; orientation: string }[];
  versions: Version[];
  curation: { justification: string; by: string; at: string } | null;
};

export async function voteForEditing(
  id: number,
): Promise<VoteForEditing | null> {
  const sql = editorDb();
  const [v] = await sql<
    {
      id: string;
      occurred_on: string;
      house: string;
      description: string;
      approved: boolean | null;
      yes: number;
      no: number;
      other: number;
      label: string | null;
      summary: string | null;
      proposition_url: string | null;
      source_url: string | null;
      criteria: string[] | null;
    }[]
  >`
    select v.id::text, v.occurred_on::text, h.slug as house, v.description, v.approved, v.yes,
           v.no, v.other, v.proposition_label as label, v.proposition_summary as summary,
           v.proposition_url, v.source_url, r.criteria
    from core.votes v
    join core.legislative_houses h on h.id = v.house_id
    left join core.vote_relevance r on r.vote_id = v.id
    where v.id = ${id}`;
  if (!v) return null;
  const [orientations, versions, curation] = await Promise.all([
    sql<{ bench: string; orientation: string }[]>`
      select bench, orientation from core.vote_orientations
      where vote_id = ${id} order by bench collate "und-x-icu"`,
    sql<
      {
        version: number;
        text: string;
        status: string;
        author: string;
        ai_model: string | null;
        created_at: string;
        approved_by: string | null;
        approved_at: string | null;
      }[]
    >`
      select version, text, status, author, ai_model, created_at::text, approved_by,
             approved_at::text
      from editorial.vote_summaries where vote_id = ${id} order by version desc`,
    sql<{ justification: string; curated_by: string; curated_at: string }[]>`
      select justification, curated_by, curated_at::text from core.vote_curation
      where vote_id = ${id}`,
  ]);
  return {
    id: Number(v.id),
    occurredOn: v.occurred_on,
    house: v.house,
    description: v.description,
    approved: v.approved,
    yes: v.yes,
    no: v.no,
    other: v.other,
    label: v.label,
    summary: v.summary,
    propositionUrl: v.proposition_url,
    sourceUrl: v.source_url,
    criteria: v.criteria ?? [],
    orientations: [...orientations],
    versions: versions.map((r) => ({
      version: r.version,
      text: r.text,
      status: r.status,
      author: r.author,
      aiModel: r.ai_model,
      createdAt: r.created_at,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
    })),
    curation: curation[0]
      ? {
          justification: curation[0].justification,
          by: curation[0].curated_by,
          at: curation[0].curated_at,
        }
      : null,
  };
}
