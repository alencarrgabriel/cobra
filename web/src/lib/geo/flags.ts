import flags from "./flags.json";

// Flags of the 27 states, served by the site (change identidade-de-partidos-e-ufs, design D4).

export type FlagInfo = {
  name: string;
  preposition: string;
  file: string;
  commonsTitle: string;
  commonsPage: string;
  license: string;
  sha256: string;
  retrievedAt: string;
};

export const FLAGS = flags as Record<string, FlagInfo>;

export const UF_ABBRS = Object.keys(FLAGS).sort();

/** "Bandeira do Distrito Federal", "Bandeira de São Paulo", "Bandeira da Bahia". */
export function flagAlt(uf: string): string {
  const info = FLAGS[uf];
  if (!info) throw new Error(`Unknown UF: ${uf}`);
  return `Bandeira ${info.preposition} ${info.name}`;
}

export function flagSrc(uf: string): string {
  const info = FLAGS[uf];
  if (!info) throw new Error(`Unknown UF: ${uf}`);
  return `/bandeiras/${info.file}`;
}
