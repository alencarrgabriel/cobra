import "server-only";

import { cacheLife } from "next/cache";

import { type DbResult, tryDb, unwrap } from "@/lib/db";
import { partyColor } from "@/lib/party-color";

// Representatives of a place (change busca-geografica, design D4). Only Cobra's own database.

export type House = "senado" | "camara" | "cldf";

export type Representative = {
  id: number;
  name: string;
  house: House;
  status: "titular" | "suplente";
  since: string;
  uf: string;
  photoUrl: string | null;
  party: { acronym: string; name: string; color: string } | null;
  officialUrl: string | null;
};

export type HouseUpdate = { house: House; collectedAt: string | null };

const OFFICIAL: Record<
  House,
  (externalId: string, mandateUrl: string | null) => string | null
> = {
  camara: (id) => `https://www.camara.leg.br/deputados/${id}`,
  senado: (id) =>
    `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}`,
  cldf: (_id, url) => url,
};

type Row = {
  id: string;
  name: string;
  house: House;
  status: "titular" | "suplente";
  since: string;
  uf: string;
  photo_url: string | null;
  acronym: string | null;
  party_name: string | null;
  color: string | null;
  external_id: string | null;
  mandate_url: string | null;
};

async function cachedRepresentatives(
  ufCode: string,
): Promise<DbResult<Representative[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<Row[]>`
      select p.id::text as id, p.parliamentary_name as name, h.slug as house,
             m.status::text as status, m.started_on::text as since, l.uf_abbr as uf,
             p.photo_url, pa.acronym, pa.name as party_name, c.color,
             e.external_id, m.source_url as mandate_url
      from core.mandates m
      join core.legislative_houses h on h.id = m.house_id
      join core.politicians p on p.id = m.politician_id
      join core.localities l on l.ibge_code = m.locality_code
      left join core.party_affiliations a on a.politician_id = p.id and a.ended_on is null
      left join core.parties pa on pa.id = a.party_id
      left join core.party_colors c on c.acronym = pa.acronym
      left join core.politician_external_ids e
        on e.politician_id = p.id and e.system::text = h.slug
      where m.locality_code = ${ufCode} and m.ended_on is null
        and m.status in ('titular', 'suplente')
        and h.slug in ('senado', 'camara', 'cldf')
      order by p.parliamentary_name`;
    return rows.map((r): Representative => ({
      id: Number(r.id),
      name: r.name,
      house: r.house,
      status: r.status,
      since: r.since,
      uf: r.uf,
      photoUrl: r.photo_url,
      party: r.acronym
        ? {
            acronym: r.acronym,
            name: r.party_name ?? r.acronym,
            color: r.color ?? partyColor({}, r.acronym),
          }
        : null,
      officialUrl: r.external_id
        ? OFFICIAL[r.house](r.external_id, r.mandate_url)
        : null,
    }));
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export async function getRepresentatives(
  ufCode: string,
): Promise<Representative[]> {
  return unwrap(await cachedRepresentatives(ufCode));
}

async function cachedUpdates(): Promise<DbResult<HouseUpdate[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<{ house: House; collected: string | null }[]>`
      select h.slug as house,
             to_char(max(m.collected_at) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')
               as collected
      from core.mandates m join core.legislative_houses h on h.id = m.house_id
      group by h.slug`;
    return rows.map((r) => ({ house: r.house, collectedAt: r.collected }));
  });
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

export async function getHouseUpdates(): Promise<HouseUpdate[]> {
  return unwrap(await cachedUpdates());
}
