import "server-only";

import { cacheLife } from "next/cache";

import { type DbResult, tryDb, unwrap } from "@/lib/db";

import type { Lookup, Place } from "./resolve";

// Place lookups for the search (design D2). Same cache pattern as the works queries.

type Row = { code: string; name: string; uf: string };
const toPlace = (r: Row): Place => ({ code: r.code, name: r.name, uf: r.uf });

async function cachedUf(key: string): Promise<DbResult<Place | null>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const [row] = await sql<Row[]>`
      select ibge_code as code, name, uf_abbr as uf from core.localities
      where kind = 'uf' and (lower(uf_abbr) = ${key} or search_name = ${key})`;
    return row ? toPlace(row) : null;
  });
  if (result.ok) cacheLife("days");
  else cacheLife("seconds");
  return result;
}

async function cachedMunicipalities(
  key: string,
  prefix: boolean,
): Promise<DbResult<Place[]>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const rows = await sql<Row[]>`
      select ibge_code as code, name, uf_abbr as uf from core.localities
      where kind = 'municipality'
        and ${prefix ? sql`search_name like ${`${key}%`}` : sql`search_name = ${key}`}
      order by name collate "und-x-icu", uf_abbr limit 10`;
    return rows.map(toPlace);
  });
  if (result.ok) cacheLife("days");
  else cacheLife("seconds");
  return result;
}

export const placeLookup: Lookup = {
  uf: async (key) => unwrap(await cachedUf(key)),
  municipalities: async (key) => unwrap(await cachedMunicipalities(key, false)),
  startingWith: async (key) => unwrap(await cachedMunicipalities(key, true)),
};

export type PlaceDetail = Place & {
  kind: "uf" | "municipality";
  ufCode: string;
  ufName: string;
};

async function cachedPlace(
  code: string,
): Promise<DbResult<PlaceDetail | null>> {
  "use cache";
  const result = await tryDb(async (sql) => {
    const [row] = await sql<
      {
        code: string;
        name: string;
        uf: string;
        kind: "uf" | "municipality";
        uf_code: string;
        uf_name: string;
      }[]
    >`
      select l.ibge_code as code, l.name, l.uf_abbr as uf, l.kind::text as kind, l.uf_code,
             u.name as uf_name
      from core.localities l join core.localities u on u.ibge_code = l.uf_code
      where l.ibge_code = ${code}`;
    return row
      ? {
          code: row.code,
          name: row.name,
          uf: row.uf,
          kind: row.kind,
          ufCode: row.uf_code,
          ufName: row.uf_name,
        }
      : null;
  });
  if (result.ok) cacheLife("days");
  else cacheLife("seconds");
  return result;
}

export async function getPlace(code: string): Promise<PlaceDetail | null> {
  return unwrap(await cachedPlace(code));
}

/** Municipalities to choose from when a city name has homonyms. */
export async function choosePlaces(key: string): Promise<Place[]> {
  const exact = await placeLookup.municipalities(key);
  return exact.length ? exact : placeLookup.startingWith(key);
}
