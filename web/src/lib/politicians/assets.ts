// Declared assets on the profile (change ingestao-tse-patrimonio, design D4): variation between
// one declaration and the previous one of the same politician, in reais and in percent.

export type Declaration = {
  year: number;
  office: string;
  total: number | null; // null: the candidacy has no asset in the TSE file
  imoveis: number;
  veiculos: number;
  dinheiro: number;
  outros: number;
};

export type WithVariation = Declaration & {
  variation: { value: number; percent: number | null } | null;
};

/** Most recent first; each declaration compared with the previous one that has assets. */
export function withVariation(rows: Declaration[]): WithVariation[] {
  const oldestFirst = [...rows].sort((a, b) => a.year - b.year);
  let previous: number | null = null;
  const out: WithVariation[] = [];
  for (const row of oldestFirst) {
    const total = row.total ?? 0;
    const variation =
      previous === null
        ? null
        : {
            value: total - previous,
            percent:
              previous > 0 ? ((total - previous) / previous) * 100 : null,
          };
    out.push({ ...row, variation });
    previous = total;
  }
  return out.reverse();
}

const PERCENT = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
  signDisplay: "always",
});

/** "+50%", "-12%"; null when there is no previous value to compare. */
export function formatPercent(percent: number | null): string | null {
  return percent === null ? null : `${PERCENT.format(percent)}%`;
}
