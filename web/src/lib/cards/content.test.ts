import { describe, expect, it } from "vitest";

import type { Politician } from "@/lib/politicians/queries";

import { clip, initials, placeCard, politicianCard, workCard } from "./content";
import { isCardFormat } from "./formats";

const senator: Politician = {
  id: 1,
  name: "Damares Alves",
  civilName: "Damares Regina Alves",
  photoUrl: null,
  party: { acronym: "REPUBLICANOS", name: "Republicanos", color: "#005ca9" },
  mandates: [
    {
      house: "senado",
      office: "senador",
      uf: "DF",
      ufCode: "53",
      status: "titular",
      startedOn: "2023-02-01",
      endedOn: null,
    },
  ],
  affiliations: [],
  externalIds: {},
  collectedAt: "2026-10-26",
};

describe("politicianCard", () => {
  it("states the fixed sentence, the amendments, source and date", () => {
    const card = politicianCard(senator, { count: 2, committed: 1_500_000 });
    expect(card.kicker).toBe("Senador(a) · Distrito Federal");
    expect(card.lines).toEqual([
      "Damares Alves tem mandato no Senado Federal pelo Distrito Federal, pelo Republicanos, desde 01/02/2023.",
      "2 emendas com destino ao DF, com R$ 1,5 mi empenhados.",
    ]);
    expect(card.source).toBe("Senado Federal; Portal da Transparência");
    expect(card.updatedOn).toBe("2026-10-26");
    expect(card.photo).toEqual({ url: null, initials: "DA" });
  });

  it("uses the same template for any party: only the badge color changes", () => {
    const other = politicianCard(
      {
        ...senator,
        party: {
          acronym: "PT",
          name: "Partido dos Trabalhadores",
          color: "#c8102e",
        },
      },
      { count: 0, committed: 0 },
    );
    const one = politicianCard(senator, { count: 0, committed: 0 });
    expect(Object.keys(other)).toEqual(Object.keys(one));
    expect(other.badge).toEqual({ text: "PT", color: "#c8102e" });
    expect(other.source).toBe("Senado Federal");
  });
});

describe("placeCard", () => {
  it("counts the representatives of each house", () => {
    const card = placeCard(
      { kind: "uf", name: "Distrito Federal", uf: "DF" },
      { senado: 3, camara: 8, cldf: 24 },
      "2026-10-26",
    );
    expect(card.title).toBe("Representantes do Distrito Federal");
    expect(card.lines).toEqual([
      "3 senadores(as) no Senado Federal",
      "8 deputados(as) federais na Câmara dos Deputados",
      "24 deputados(as) distritais na Câmara Legislativa do DF",
    ]);
    expect(card.flagUf).toBe("DF");
  });

  it("names a municipality with its UF and leaves out houses it does not have", () => {
    const card = placeCard(
      { kind: "municipality", name: "São Paulo", uf: "SP" },
      { senado: 1, camara: 70 },
      null,
    );
    expect(card.title).toBe("Representantes de São Paulo (SP)");
    expect(card.lines).toEqual([
      "1 senador(a) no Senado Federal",
      "70 deputados(as) federais na Câmara dos Deputados",
    ]);
  });
});

describe("workCard", () => {
  const work = {
    name: "UBS de Teste",
    type: "Saúde",
    status: "stopped" as const,
    stoppedSince: "2025-05-07",
    plannedValue: 5_900_000,
    progress: null,
    address: "Trecho 2, Sol Nascente - DF",
    sourceUpdatedAt: "2026-10-23",
    collectedAt: "2026-10-26T10:00:00Z",
  };

  it("shows the status with the stoppage time and '—' for missing values", () => {
    const card = workCard(work, new Date(2026, 9, 27));
    expect(card.status).toEqual({
      text: "Paralisada há 17 meses",
      color: "#b42346",
    });
    expect(card.lines).toEqual([
      "Valor previsto: R$ 5.900.000,00",
      "Execução física: —",
      "Trecho 2, Sol Nascente - DF",
    ]);
    expect(card.source).toBe("Obrasgov.br");
    expect(card.updatedOn).toBe("2026-10-23");
  });
});

describe("helpers", () => {
  it("accepts only the three formats", () => {
    expect(isCardFormat("stories")).toBe(true);
    expect(isCardFormat("link")).toBe(true);
    expect(isCardFormat("toString")).toBe(false);
  });

  it("clips long text and builds initials", () => {
    expect(clip("abcdef", 4)).toBe("abc…");
    expect(initials("Prof. Reginaldo Veras")).toBe("PV");
    expect(initials("Lula")).toBe("L");
  });
});
