import { describe, expect, it } from "vitest";

import { normalizeCep, placeFromCep, ufFromCep } from "@/lib/geo/cep";

import { type Lookup, type Place, resolve, searchKey } from "./resolve";

const BOM_JESUS: Place[] = [
  { code: "2201903", name: "Bom Jesus", uf: "PI" },
  { code: "4302303", name: "Bom Jesus", uf: "RS" },
];

const lookup: Lookup = {
  uf: async (key) =>
    key === "sp" || key === "sao paulo"
      ? { code: "35", name: "São Paulo", uf: "SP" }
      : null,
  municipalities: async (key) =>
    key === "bom jesus"
      ? BOM_JESUS
      : key === "taguatinga"
        ? [{ code: "1720804", name: "Taguatinga", uf: "TO" }]
        : [],
  startingWith: async (key) =>
    key === "brasili" ? [{ code: "5300108", name: "Brasília", uf: "DF" }] : [],
};

describe("CEP", () => {
  it("normalizes and rejects", () => {
    expect(normalizeCep("72210-000")).toBe("72210000");
    expect(normalizeCep(" 72.210-000 ")).toBe("72210000");
    expect(normalizeCep("7221000")).toBeNull();
    expect(normalizeCep("00000000")).toBeNull();
  });

  it("maps CEP ranges to UFs, with Brasília for the DF", () => {
    expect(ufFromCep("72210000")).toBe("53");
    expect(placeFromCep("72210000")).toBe("5300108");
    expect(placeFromCep("73010000")).toBe("5300108");
    expect(placeFromCep("01310100")).toBe("35");
    expect(placeFromCep("72800000")).toBe("52"); // Entorno do DF is Goiás
    expect(placeFromCep("90010000")).toBe("43");
  });

  it("leaves the disputed range without a UF", () => {
    expect(ufFromCep("78950000")).toBeNull();
  });
});

describe("resolve", () => {
  it("goes straight to the place for a CEP", async () => {
    expect(await resolve("72210-000", lookup)).toEqual({
      kind: "place",
      code: "5300108",
    });
  });

  it("finds a UF by abbreviation or name, without accents", async () => {
    expect(await resolve("SP", lookup)).toEqual({ kind: "place", code: "35" });
    expect(await resolve("São Paulo", lookup)).toEqual({
      kind: "place",
      code: "35",
    });
  });

  it("asks to choose between homonyms", async () => {
    expect(await resolve("Bom Jesus", lookup)).toEqual({
      kind: "choose",
      query: "bom jesus",
    });
  });

  it("uses the only municipality with that name or prefix", async () => {
    expect(await resolve("Taguatinga", lookup)).toEqual({
      kind: "place",
      code: "1720804",
    });
    expect(await resolve("brasili", lookup)).toEqual({
      kind: "place",
      code: "5300108",
    });
  });

  it("says when nothing matches", async () => {
    expect(await resolve("xyz123", lookup)).toEqual({ kind: "not-found" });
    expect(await resolve(" ", lookup)).toEqual({ kind: "not-found" });
    expect(await resolve("78950-000", lookup)).toEqual({ kind: "not-found" });
  });

  it("builds the same search key as the collector", () => {
    expect(searchKey("  Alta  Floresta D'Oeste ")).toBe(
      "alta floresta d'oeste",
    );
  });
});
