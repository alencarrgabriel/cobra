import { describe, expect, it } from "vitest";

import { formatPercent, withVariation } from "./assets";

const row = (year: number, total: number | null) => ({
  year,
  office: "DEPUTADO FEDERAL",
  total,
  imoveis: 0,
  veiculos: 0,
  dinheiro: 0,
  outros: 0,
});

describe("declared assets", () => {
  it("compares each declaration with the previous one, most recent first", () => {
    const [d2022, d2018, d2014] = withVariation([
      row(2014, 0),
      row(2022, 1_500_000),
      row(2018, 1_000_000),
    ]);
    expect(d2022!.variation).toEqual({ value: 500_000, percent: 50 });
    expect(d2018!.variation).toEqual({ value: 1_000_000, percent: null });
    expect(d2014!.variation).toBeNull();
  });

  it("treats a candidacy without assets as zero for the next comparison", () => {
    const [d2022] = withVariation([row(2018, null), row(2022, 200)]);
    expect(d2022!.variation).toEqual({ value: 200, percent: null });
  });

  it("formats the percent with its sign", () => {
    expect(formatPercent(50)).toBe("+50%");
    expect(formatPercent(-12.4)).toBe("-12%");
    expect(formatPercent(null)).toBeNull();
  });
});
