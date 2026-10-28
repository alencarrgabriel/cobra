import { describe, expect, it } from "vitest";

import { optionText, tally } from "./options";

describe("vote options", () => {
  it("reads options, absences and missing ballots", () => {
    expect(optionText("sim", null)).toBe("Sim");
    expect(optionText("ausente", "Licença saúde")).toBe(
      "Ausente: Licença saúde",
    );
    expect(optionText(null, null)).toBe("Não registrou voto");
  });

  it("tallies per party in alphabetical order", () => {
    expect(
      tally(
        [
          { name: "A", party: "PT", uf: "SP", option: "sim" },
          { name: "B", party: "PL", uf: "DF", option: "nao" },
          { name: "C", party: "PT", uf: "DF", option: "abstencao" },
          { name: "D", party: null, uf: "DF", option: "sim" },
        ],
        "party",
      ),
    ).toEqual([
      { key: "PL", yes: 0, no: 1, other: 0 },
      { key: "PT", yes: 1, no: 0, other: 1 },
      { key: "Sem informação", yes: 1, no: 0, other: 0 },
    ]);
  });

  it("tallies per UF", () => {
    expect(
      tally(
        [
          { name: "A", party: "PT", uf: "SP", option: "sim" },
          { name: "B", party: "PL", uf: "DF", option: "nao" },
        ],
        "uf",
      ).map((r) => r.key),
    ).toEqual(["DF", "SP"]);
  });
});
