import { FLAGS } from "./flags";
import map from "./br-map.json";

// Map of Brazil (change mapa-do-brasil, design D1): paths projected once from the IBGE mesh.

export type MapState = { uf: string; code: string; name: string; d: string };

export const BR_MAP = {
  source: map.source,
  retrievedAt: map.retrievedAt,
  viewBox: map.viewBox,
};

const collator = new Intl.Collator("pt-BR");

/** The 27 UFs in alphabetical order of their names. */
export const MAP_STATES: MapState[] = Object.entries(map.states)
  .map(([uf, s]) => ({ uf, code: s.code, name: FLAGS[uf]?.name ?? uf, d: s.d }))
  .sort((a, b) => collator.compare(a.name, b.name));
