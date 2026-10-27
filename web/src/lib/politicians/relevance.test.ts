import { describe, expect, it } from "vitest";

import { relevanceText } from "./relevance";

describe("relevance in words", () => {
  it("lists the criteria", () => {
    expect(relevanceText(["placar_disputado", "tipo_de_materia"], "PEC")).toBe(
      "Votação relevante: placar disputado; tipo de matéria: PEC",
    );
    expect(relevanceText(["divergencia"], "PL")).toBe(
      "Votação relevante: Governo e Oposição divergiram",
    );
  });

  it("says nothing when no criterion is met", () => {
    expect(relevanceText([], "PL")).toBeNull();
  });
});
