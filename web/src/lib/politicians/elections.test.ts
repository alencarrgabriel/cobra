import { describe, expect, it } from "vitest";

import { officeLabel, partyTimeline, resultLabel } from "./elections";

describe("electoral history", () => {
  it("says the result in plain, gender-neutral words", () => {
    expect(resultLabel("ELEITO POR QP")).toBe(
      "Eleito(a) por quociente partidário",
    );
    expect(resultLabel("NÃO ELEITO")).toBe("Não eleito(a)");
    expect(resultLabel("RENÚNCIA")).toBe("RENÚNCIA");
    expect(resultLabel(null)).toBe("—");
  });

  it("writes the office in sentence case", () => {
    expect(officeLabel("DEPUTADO FEDERAL")).toBe("Deputado federal");
  });

  it("lists parties in order without repeating consecutive ones", () => {
    expect(
      partyTimeline([
        { year: 2022, party: "PL" },
        { year: 2010, party: "PMDB" },
        { year: 2014, party: "PMDB" },
        { year: 2018, party: null },
        { year: 2018, party: "PSL" },
      ]),
    ).toEqual([
      { party: "PMDB", from: 2010, to: 2014 },
      { party: "PSL", from: 2018, to: 2018 },
      { party: "PL", from: 2022, to: 2022 },
    ]);
  });
});
