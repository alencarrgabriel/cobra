import { describe, expect, it } from "vitest";

import { filtersHref, parseFilters, slugify } from "./filters";

describe("parseFilters", () => {
  it("uses the defaults without parameters", () => {
    expect(parseFilters({})).toEqual({
      status: null,
      area: null,
      order: "valor",
      page: 1,
    });
  });

  it("reads valid values", () => {
    expect(
      parseFilters({
        situacao: "paralisada",
        area: "saude",
        ordem: "nome",
        pagina: "3",
      }),
    ).toEqual({ status: "stopped", area: "saude", order: "nome", page: 3 });
    expect(parseFilters({ situacao: "em-execucao" }).status).toBe(
      "in_progress",
    );
  });

  it("ignores invalid values instead of failing", () => {
    expect(
      parseFilters({
        situacao: "stopped",
        area: "<script>",
        ordem: "desempenho",
        pagina: "-2",
      }),
    ).toEqual({ status: null, area: null, order: "valor", page: 1 });
    expect(parseFilters({ pagina: "1.5" }).page).toBe(1);
    expect(parseFilters({ pagina: "abc" }).page).toBe(1);
  });

  it("takes the first value of repeated parameters", () => {
    expect(parseFilters({ situacao: ["concluida", "cancelada"] }).status).toBe(
      "completed",
    );
  });
});

describe("filtersHref", () => {
  it("leaves defaults out of the address", () => {
    expect(filtersHref(parseFilters({}))).toBe("/obras");
  });

  it("round-trips the filters", () => {
    const f = parseFilters({
      situacao: "paralisada",
      area: "saude",
      ordem: "nome",
      pagina: "2",
    });
    const href = filtersHref(f);
    expect(href).toBe(
      "/obras?situacao=paralisada&area=saude&ordem=nome&pagina=2",
    );
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseFilters(params)).toEqual(f);
  });
});

describe("slugify", () => {
  it("removes accents and punctuation", () => {
    expect(slugify("Saúde")).toBe("saude");
    expect(slugify("Infraestrutura Hídrica, Portos, Hidrovia")).toBe(
      "infraestrutura-hidrica-portos-hidrovia",
    );
  });
});
