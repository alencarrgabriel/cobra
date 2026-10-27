import { normalizeCep, placeFromCep } from "@/lib/geo/cep";

// What the person typed → where to go (change busca-geografica, design D2 and D3).
// Pure: the database lookups are passed in, so this is testable without a database.

export type Place = { code: string; name: string; uf: string };

export type Lookup = {
  /** UFs by abbreviation ("df") and by search name ("distrito federal"). */
  uf: (normalized: string) => Promise<Place | null>;
  /** Municipalities whose search name is exactly the text. */
  municipalities: (normalized: string) => Promise<Place[]>;
  /** Municipalities whose search name starts with the text (at most 10). */
  startingWith: (normalized: string) => Promise<Place[]>;
};

export type Resolution =
  | { kind: "place"; code: string }
  | { kind: "choose"; query: string }
  | { kind: "not-found" };

/** Accent-free, lower case, single spaces (same rule as the collector's search_name). */
export function searchKey(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolve(
  text: string,
  lookup: Lookup,
): Promise<Resolution> {
  const cep = normalizeCep(text);
  if (cep) {
    const code = placeFromCep(cep);
    return code ? { kind: "place", code } : { kind: "not-found" };
  }
  const key = searchKey(text);
  if (key.length < 2) return { kind: "not-found" };
  const uf = await lookup.uf(key);
  if (uf) return { kind: "place", code: uf.code };
  const exact = await lookup.municipalities(key);
  if (exact.length === 1) return { kind: "place", code: exact[0].code };
  if (exact.length > 1) return { kind: "choose", query: key };
  const partial = await lookup.startingWith(key);
  if (partial.length === 1) return { kind: "place", code: partial[0].code };
  if (partial.length > 1) return { kind: "choose", query: key };
  return { kind: "not-found" };
}
