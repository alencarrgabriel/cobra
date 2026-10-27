import { describe, expect, it } from "vitest";

import { MAP_STATES } from "./br-map";
import { UF_ABBRS } from "./flags";

describe("map of Brazil", () => {
  it("has the 27 UFs with an IBGE code and a path", () => {
    expect(MAP_STATES.map((s) => s.uf).sort()).toEqual(UF_ABBRS);
    for (const s of MAP_STATES) {
      expect(s.code).toMatch(/^\d{2}$/);
      expect(s.d).toMatch(/^M[\d.,LMZ]+Z$/);
    }
    expect(MAP_STATES.find((s) => s.uf === "DF")?.code).toBe("53");
  });

  it("lists them in alphabetical order", () => {
    const names = MAP_STATES.map((s) => s.name);
    expect(names[0]).toBe("Acre");
    expect(names.at(-1)).toBe("Tocantins");
  });
});
