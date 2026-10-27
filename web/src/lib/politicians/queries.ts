import "server-only";

import { cacheLife } from "next/cache";

import { type DbResult, tryDb, unwrap } from "@/lib/db";
import { NEUTRAL_PARTY_COLOR } from "@/lib/party-color";
import type { WorkStatus } from "@/lib/works/filters";

import type { Declaration } from "./assets";
import type { HouseSlug } from "./who";

// Profile data (change perfil-do-politico, design D2). Only Cobra's own database.

export type Party = { acronym: string; name: string; color: string };

export type Mandate = {
  house: HouseSlug;
  office: string;
  uf: string;
  ufCode: string;
  status: "titular" | "suplente" | "licenciado";
  startedOn: string;
  endedOn: string | null;
};

export type Affiliation = {
  party: Party;
  startedOn: string | null;
  endedOn: string | null;
};

export type Politician = {
  id: number;
  name: string;
  civilName: string;
  photoUrl: string | null;
  party: Party | null;
  mandates: Mandate[];
  affiliations: Affiliation[];
  externalIds: Partial<Record<HouseSlug, string>>;
  collectedAt: string | null;
};

export type AmendmentRow = {
  code: string;
  year: number;
  type: string;
  mainFunction: string | null;
  locality: string;
  committed: number;
  liquidated: number;
  paid: number;
};

export type LinkedWork = {
  code: string;
  name: string;
  status: WorkStatus;
  amendment: string;
  confidence: string;
};

export type Related = {
  id: number;
  name: string;
  uf: string;
  party: string | null;
};

type PartyRow = {
  acronym: string | null;
  party_name: string | null;
  color: string | null;
};

const party = (r: PartyRow): Party | null =>
  r.acronym
    ? {
        acronym: r.acronym,
        name: r.party_name ?? r.acronym,
        color: r.color ?? NEUTRAL_PARTY_COLOR,
      }
    : null;

function cache(ok: boolean) {
  if (ok) cacheLife("hours");
  else cacheLife("seconds");
}

async function cachedPolitician(
  id: number,
): Promise<DbResult<Politician | null>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const [p] = await sql<
      ({
        id: string;
        name: string;
        civil_name: string;
        photo_url: string | null;
        collected: string | null;
      } & PartyRow)[]
    >`
      select p.id::text, p.parliamentary_name as name, p.civil_name, p.photo_url,
             to_char(p.collected_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as collected,
             pa.acronym, pa.name as party_name, c.color
      from core.politicians p
      left join core.party_affiliations a on a.politician_id = p.id and a.ended_on is null
      left join core.parties pa on pa.id = a.party_id
      left join core.party_colors c on c.acronym = pa.acronym
      where p.id = ${id}`;
    if (!p) return null;
    const mandates = await sql<
      {
        house: HouseSlug;
        office: string;
        uf: string;
        uf_code: string;
        status: Mandate["status"];
        started_on: string;
        ended_on: string | null;
      }[]
    >`
      select h.slug as house, m.office::text as office, l.uf_abbr as uf, l.uf_code,
             m.status::text as status, m.started_on::text, m.ended_on::text
      from core.mandates m
      join core.legislative_houses h on h.id = m.house_id
      join core.localities l on l.ibge_code = m.locality_code
      where m.politician_id = ${id}
      order by m.ended_on desc nulls first, m.started_on desc`;
    const affiliations = await sql<
      ({ started_on: string | null; ended_on: string | null } & PartyRow)[]
    >`
      select a.started_on::text, a.ended_on::text, pa.acronym, pa.name as party_name, c.color
      from core.party_affiliations a
      join core.parties pa on pa.id = a.party_id
      left join core.party_colors c on c.acronym = pa.acronym
      where a.politician_id = ${id}
      order by a.ended_on desc nulls first, a.started_on desc nulls last`;
    const ids = await sql<{ system: HouseSlug; external_id: string }[]>`
      select system::text as system, external_id from core.politician_external_ids
      where politician_id = ${id} and system::text in ('camara', 'senado', 'cldf')`;
    return {
      id: Number(p.id),
      name: p.name,
      civilName: p.civil_name,
      photoUrl: p.photo_url,
      party: party(p),
      mandates: mandates.map((m) => ({
        house: m.house,
        office: m.office,
        uf: m.uf,
        ufCode: m.uf_code,
        status: m.status,
        startedOn: m.started_on,
        endedOn: m.ended_on,
      })),
      affiliations: affiliations.flatMap((a) => {
        const p2 = party(a);
        return p2
          ? [{ party: p2, startedOn: a.started_on, endedOn: a.ended_on }]
          : [];
      }),
      externalIds: Object.fromEntries(
        ids.map((i) => [i.system, i.external_id]),
      ),
      collectedAt: p.collected,
    };
  });
  cache(result.ok);
  return result;
}

export async function getPolitician(id: number): Promise<Politician | null> {
  return unwrap(await cachedPolitician(id));
}

async function cachedAmendments(id: number): Promise<DbResult<AmendmentRow[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<
      {
        code: string;
        year: number;
        type: string;
        main_function: string | null;
        locality: string;
        committed: string;
        liquidated: string;
        paid: string;
      }[]
    >`
      select a.source_id as code, a.year, a.type, a.main_function, a.locality,
             a.committed, a.liquidated, a.paid
      from core.amendments a join core.amendment_authors au on au.id = a.author_id
      where au.politician_id = ${id}
      order by a.year desc, a.source_id`;
    return rows.map((r) => ({
      code: r.code,
      year: Number(r.year),
      type: r.type,
      mainFunction: r.main_function,
      locality: r.locality,
      committed: Number(r.committed),
      liquidated: Number(r.liquidated),
      paid: Number(r.paid),
    }));
  });
  cache(result.ok);
  return result;
}

export async function getAmendments(id: number): Promise<AmendmentRow[]> {
  return unwrap(await cachedAmendments(id));
}

async function cachedWorks(id: number): Promise<DbResult<LinkedWork[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<
      {
        code: string;
        name: string;
        status: WorkStatus;
        amendment: string;
        confidence: string;
      }[]
    >`
      select * from (
        select distinct w.source_id as code, w.name, w.status::text as status,
               a.source_id as amendment, l.confidence
        from core.work_amendment_links l
        join core.works w on w.id = l.work_id
        join core.amendments a on a.id = l.amendment_id
        where l.politician_id = ${id}
      ) linked
      order by name collate "und-x-icu", amendment`;
    return rows.map((r) => ({ ...r }));
  });
  cache(result.ok);
  return result;
}

export async function getLinkedWorks(id: number): Promise<LinkedWork[]> {
  return unwrap(await cachedWorks(id));
}

async function cachedRelated(
  id: number,
  ufCode: string | null,
  acronym: string | null,
): Promise<DbResult<{ sameUf: Related[]; sameParty: Related[] }>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    // ICU collation: the same alphabetical order on every host (libc collations differ).
    const base = (where: ReturnType<typeof sql>) => sql<
      { id: string; name: string; uf: string; party: string | null }[]
    >`
      select distinct on (p.parliamentary_name collate "und-x-icu", p.id) p.id::text, p.parliamentary_name as name,
             l.uf_abbr as uf, pa.acronym as party
      from core.politicians p
      join core.mandates m on m.politician_id = p.id and m.ended_on is null
      join core.localities l on l.ibge_code = m.locality_code
      left join core.party_affiliations a on a.politician_id = p.id and a.ended_on is null
      left join core.parties pa on pa.id = a.party_id
      where p.id <> ${id} and ${where}
      order by p.parliamentary_name collate "und-x-icu", p.id
      limit 12`;
    const map = (
      rows: { id: string; name: string; uf: string; party: string | null }[],
    ) =>
      rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        uf: r.uf,
        party: r.party,
      }));
    const sameUf = ufCode
      ? map(await base(sql`m.locality_code = ${ufCode}`))
      : [];
    const sameParty = acronym
      ? map(await base(sql`pa.acronym = ${acronym}`))
      : [];
    return { sameUf, sameParty };
  });
  cache(result.ok);
  return result;
}

export async function getRelated(
  id: number,
  ufCode: string | null,
  acronym: string | null,
) {
  return unwrap(await cachedRelated(id, ufCode, acronym));
}

export type CandidacyRow = {
  year: number;
  round: number;
  office: string;
  uf: string | null;
  unit: string | null;
  party: string | null;
  result: string | null;
  votes: number | null;
  collectedAt: string;
};

async function cachedCandidacies(
  id: number,
): Promise<DbResult<CandidacyRow[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<
      {
        year: number;
        round: number;
        office: string;
        uf: string | null;
        unit: string | null;
        party: string | null;
        result: string | null;
        votes: string | null;
        collected: string;
      }[]
    >`
      select election_year as year, round, office, uf, unit_name as unit,
             party_acronym as party, result, votes,
             to_char(collected_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as collected
      from core.candidacies
      where politician_id = ${id}
      order by election_year desc, round desc`;
    return rows.map((r) => ({
      year: Number(r.year),
      round: Number(r.round),
      office: r.office,
      uf: r.uf,
      unit: r.unit,
      party: r.party,
      result: r.result,
      votes: r.votes === null ? null : Number(r.votes),
      collectedAt: r.collected,
    }));
  });
  cache(result.ok);
  return result;
}

/** TSE candidacies, most recent first (change ingestao-tse-candidaturas, D5). */
export async function getCandidacies(id: number): Promise<CandidacyRow[]> {
  return unwrap(await cachedCandidacies(id));
}

export type AssetsData = {
  declarations: Declaration[];
  collectedAt: string | null;
};

async function cachedAssets(id: number): Promise<DbResult<AssetsData>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    // One line per election since 2006 with a candidacy, whether or not it declared assets.
    const rows = await sql<
      {
        year: number;
        office: string;
        total: string | null;
        imoveis: string;
        veiculos: string;
        dinheiro: string;
        outros: string;
        collected: string | null;
      }[]
    >`
      select c.election_year as year, min(c.office) as office,
             sum(a.value) as total,
             coalesce(sum(a.value) filter (where a.category = 'imoveis'), 0) as imoveis,
             coalesce(sum(a.value) filter (where a.category = 'veiculos'), 0) as veiculos,
             coalesce(sum(a.value) filter (where a.category = 'dinheiro'), 0) as dinheiro,
             coalesce(sum(a.value) filter (where a.category = 'outros'), 0) as outros,
             to_char(max(a.collected_at) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')
               as collected
      from (select distinct election_year, tse_candidate_id, office from core.candidacies
            where politician_id = ${id} and election_year >= 2006) c
      left join core.declared_assets a
        on a.election_year = c.election_year and a.tse_candidate_id = c.tse_candidate_id
      group by c.election_year
      order by c.election_year desc`;
    return {
      declarations: rows.map((r) => ({
        year: Number(r.year),
        office: r.office,
        total: r.total === null ? null : Number(r.total),
        imoveis: Number(r.imoveis),
        veiculos: Number(r.veiculos),
        dinheiro: Number(r.dinheiro),
        outros: Number(r.outros),
      })),
      collectedAt:
        rows
          .map((r) => r.collected)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null,
    };
  });
  cache(result.ok);
  return result;
}

/** Declared assets per election since 2006 (change ingestao-tse-patrimonio, D4). */
export async function getAssets(id: number): Promise<AssetsData> {
  return unwrap(await cachedAssets(id));
}

export type ReceiptsYear = {
  year: number;
  total: number;
  byOrigin: { origin: string; total: number }[];
  fefc: number;
  partyFund: number;
  privateDonors: number;
  privateTotal: number;
  parties: { name: string; total: number }[];
};

export type ReceiptsData = {
  years: ReceiptsYear[];
  collectedAt: string | null;
};

async function cachedReceipts(id: number): Promise<DbResult<ReceiptsData>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<
      {
        year: number;
        origin: string;
        fund: string;
        donor_name: string | null;
        donors: number | null;
        total: string;
        collected: string;
      }[]
    >`
      select election_year as year, origin, fund, donor_name, donors, total,
             to_char(collected_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as collected
      from core.campaign_receipts
      where politician_id = ${id}`;
    const byYear = new Map<number, ReceiptsYear>();
    for (const r of rows) {
      const year = Number(r.year);
      const total = Number(r.total);
      const y = byYear.get(year) ?? {
        year,
        total: 0,
        byOrigin: [],
        fefc: 0,
        partyFund: 0,
        privateDonors: 0,
        privateTotal: 0,
        parties: [],
      };
      y.total += total;
      const origin = y.byOrigin.find((o) => o.origin === r.origin);
      if (origin) origin.total += total;
      else y.byOrigin.push({ origin: r.origin, total });
      if (r.fund === "fefc") y.fefc += total;
      if (r.fund === "fundo_partidario") y.partyFund += total;
      if (r.origin === "pessoas_fisicas") {
        y.privateDonors += r.donors ?? 0;
        y.privateTotal += total;
      }
      if (r.origin === "partidos" && r.donor_name) {
        const party = y.parties.find((p) => p.name === r.donor_name);
        if (party) party.total += total;
        else y.parties.push({ name: r.donor_name, total });
      }
      byYear.set(year, y);
    }
    const collator = new Intl.Collator("pt-BR");
    const years = [...byYear.values()]
      .map((y) => ({
        ...y,
        parties: y.parties.sort((a, b) => collator.compare(a.name, b.name)),
      }))
      .sort((a, b) => b.year - a.year);
    return {
      years,
      collectedAt:
        rows
          .map((r) => r.collected)
          .sort()
          .at(-1) ?? null,
    };
  });
  cache(result.ok);
  return result;
}

/** Campaign receipts since 2018 (change ingestao-tse-doadores, D4). */
export async function getReceipts(id: number): Promise<ReceiptsData> {
  return unwrap(await cachedReceipts(id));
}
