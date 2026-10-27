// Plan address (change plano-de-governo, design D1): "2022-presidente", "2022-governador-df".

export type PlanKey = {
  year: number;
  office: "presidente" | "governador";
  uf: string | null;
};

export function planSlug({ year, office, uf }: PlanKey): string {
  return [year, office, uf?.toLowerCase()].filter(Boolean).join("-");
}

export function parsePlanSlug(slug: string): PlanKey | null {
  const m = /^(\d{4})-(presidente|governador)(?:-([a-z]{2}))?$/.exec(slug);
  if (!m) return null;
  const office = m[2] as PlanKey["office"];
  // A president plan has no UF; a governor plan must have one.
  if ((office === "presidente") !== (m[3] === undefined)) return null;
  return { year: Number(m[1]), office, uf: m[3]?.toUpperCase() ?? null };
}
