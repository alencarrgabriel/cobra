import { describe, expect, it } from "vitest";

import { jsonLd, profilePath, slugify, whoIs } from "./who";

const base = {
  name: "Damares Alves",
  house: "senado" as const,
  uf: "DF",
  status: "titular" as const,
  startedOn: "2023-02-01",
  endedOn: null,
  party: { name: "Republicanos" },
};

describe("whoIs", () => {
  it("builds the fixed sentence for a titular", () => {
    expect(whoIs(base)).toBe(
      "Damares Alves tem mandato no Senado Federal pelo Distrito Federal, pelo Republicanos, desde 01/02/2023.",
    );
  });

  it("uses the right contraction for each UF", () => {
    expect(whoIs({ ...base, uf: "BA", house: "camara" })).toContain(
      "na Câmara dos Deputados pela Bahia",
    );
    expect(whoIs({ ...base, uf: "SP" })).toContain("por São Paulo");
  });

  it("covers substitutes, leaves and ended mandates", () => {
    expect(whoIs({ ...base, status: "suplente" })).toContain(
      "exerce o mandato como suplente no Senado Federal",
    );
    expect(whoIs({ ...base, status: "licenciado" })).toMatch(
      /com o exercício hoje suspenso por licença\.$/,
    );
    expect(whoIs({ ...base, endedOn: "2024-02-20" })).toBe(
      "Damares Alves teve mandato no Senado Federal pelo Distrito Federal até 20/02/2024.",
    );
  });

  it("does not repeat the DF for the CLDF", () => {
    expect(whoIs({ ...base, house: "cldf", startedOn: "2023-01-01" })).toBe(
      "Damares Alves tem mandato na Câmara Legislativa do Distrito Federal, pelo Republicanos, desde 01/01/2023.",
    );
  });

  it("leaves the party out when there is none", () => {
    expect(whoIs({ ...base, party: null })).toBe(
      "Damares Alves tem mandato no Senado Federal pelo Distrito Federal, desde 01/02/2023.",
    );
  });
});

describe("addresses and structured data", () => {
  it("builds a readable, stable address", () => {
    expect(slugify("Robério Negreiros")).toBe("roberio-negreiros");
    expect(profilePath(42, "Prof. Reginaldo Veras")).toBe(
      "/politicos/42-prof-reginaldo-veras",
    );
  });

  it("escapes JSON-LD for HTML", () => {
    expect(jsonLd({ name: "</script><b>" })).toBe(
      '{"name":"\\u003c/script\\u003e\\u003cb\\u003e"}',
    );
  });
});
