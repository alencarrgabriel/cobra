import { describe, expect, it } from "vitest";

import { excerpts, findMatches, fold, opening, searchTerms } from "./excerpt";
import { parsePlanSlug, planSlug } from "./slug";

const marked = (text: string, terms: string[], mode: "word" | "prefix") =>
  excerpts(text, findMatches(text, terms, mode)).map((e) =>
    e.map((s) => (s.mark ? `[${s.text}]` : s.text)).join(""),
  );

describe("fold", () => {
  it("keeps the length and drops accents", () => {
    expect(fold("Saúde Pública")).toBe("saude publica");
    expect(fold("Ação").length).toBe(4);
  });
});

describe("excerpts", () => {
  it("shows the PDF text with accents and marks the theme word", () => {
    expect(marked("Mais Saúde para todos.", ["saude"], "word")).toEqual([
      "Mais [Saúde] para todos.",
    ]);
  });

  it("matches whole words only for themes", () => {
    expect(findMatches("susto e sus", ["sus"], "word")).toEqual([[8, 11]]);
  });

  it("matches multi-word keywords across line breaks", () => {
    expect(
      marked("rede de\nSegurança\n Pública", ["seguranca publica"], "word"),
    ).toEqual(["rede de [Segurança Pública]"]);
  });

  it("finds the plural from the search root", () => {
    expect(searchTerms("Creches")).toEqual(["creche"]);
    expect(
      marked("Novas creches no DF", searchTerms("creche"), "prefix"),
    ).toEqual(["Novas [creches] no DF"]);
  });

  it("cuts long text at spaces, with ellipses, and joins close matches", () => {
    const text = `${"palavra ".repeat(40)}escola e escola ${"fim ".repeat(40)}`;
    const [one, ...rest] = marked(text, ["escola"], "word");
    expect(rest).toEqual([]);
    expect(one).toMatch(/^…palavra /);
    expect(one).toContain("[escola] e [escola]");
    expect(one).toMatch(/ fim…$/);
  });

  it("gives the opening of a page", () => {
    expect(
      opening("Plano  de\n governo")
        .map((s) => s.text)
        .join(""),
    ).toBe("Plano de governo");
  });
});

describe("plan slug", () => {
  it("round-trips", () => {
    expect(planSlug({ year: 2022, office: "governador", uf: "DF" })).toBe(
      "2022-governador-df",
    );
    expect(parsePlanSlug("2022-presidente")).toEqual({
      year: 2022,
      office: "presidente",
      uf: null,
    });
    expect(parsePlanSlug("2022-governador")).toBeNull();
    expect(parsePlanSlug("2022-presidente-df")).toBeNull();
  });
});
