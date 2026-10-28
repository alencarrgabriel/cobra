import { describe, expect, it } from "vitest";

import { summaryStats } from "./summary-stats";

const base = "/politicos/1-ana";
const empty = {
  base,
  house: "camara" as const,
  attendance: null,
  expenses: { years: [], collectedAt: null },
  amendments: [],
  declarations: [],
  assetsCollectedAt: null,
};

describe("summaryStats", () => {
  it("keeps the same five figures in the same order, with no data as null", () => {
    const stats = summaryStats(empty);
    expect(stats.map((s) => s.label)).toEqual([
      "Presença",
      "Salário",
      "Cota parlamentar",
      "Emendas ao DF",
      "Patrimônio declarado",
    ]);
    expect(stats.every((s) => s.value === null)).toBe(true);
    expect(stats.every((s) => s.note.length > 0)).toBe(true);
  });

  it("uses the most recent year and the house median as reference", () => {
    const stats = summaryStats({
      ...empty,
      attendance: {
        house: "camara",
        collectedAt: "2026-10-26",
        years: [
          { year: 2025, present: 90, total: 100, median: 0.8, absences: [] },
          { year: 2026, present: 75, total: 100, median: 0.81, absences: [] },
        ],
      },
      expenses: {
        collectedAt: "2026-10-26",
        years: [
          { year: 2026, total: 312_000, byCategory: [], hasRefunds: false },
          { year: 2025, total: 400_000, byCategory: [], hasRefunds: false },
        ],
      },
      amendments: [
        {
          code: "1",
          year: 2025,
          type: "x",
          mainFunction: null,
          locality: "DF",
          committed: 2_000_000,
          liquidated: 0,
          paid: 0,
        },
      ],
      declarations: [
        {
          year: 2018,
          office: "x",
          total: 100_000,
          imoveis: 0,
          veiculos: 0,
          dinheiro: 0,
          outros: 0,
        },
        {
          year: 2022,
          office: "x",
          total: 525_032,
          imoveis: 0,
          veiculos: 0,
          dinheiro: 0,
          outros: 0,
        },
      ],
    });
    expect(stats[0]!.value).toBe("75%");
    expect(stats[0]!.reference).toContain("81%");
    expect(stats[0]!.reference).toContain("2026");
    expect(stats[2]!.reference).toBe("Gasto em 2026");
    expect(stats[3]!.reference).toBe("1 emenda empenhada");
    expect(stats[4]!.reference).toBe("Declarado em 2022");
  });

  it("labels the Senate figure as attendance at nominal votes", () => {
    const stats = summaryStats({ ...empty, house: "senado" });
    expect(stats[0]!.label).toBe("Comparecimento");
  });

  it("explains the missing data of the district chamber", () => {
    const stats = summaryStats({ ...empty, house: "cldf" });
    expect(stats[0]!.note).toContain("distritais");
    expect(stats[2]!.note).toContain("distritais");
    expect(stats[3]!.note).toContain("federais");
  });
});
