import { describe, expect, it } from "vitest";

import { AA, contrastRatio, readableTextOn } from "./contrast";

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe("readableTextOn", () => {
  it.each([
    ["light yellow", "#ffd400"],
    ["mid orange", "#f97316"],
    ["mid blue", "#2563eb"],
    ["dark red", "#991b1b"],
    ["mid grey that fails both", "#808080"],
  ])("reaches AA on %s", (_, color) => {
    const { background, text, ratio } = readableTextOn(color);
    expect(ratio).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(background, text)).toBeCloseTo(ratio, 5);
  });

  it("uses dark text on light colors and light text on dark colors", () => {
    expect(readableTextOn("#ffd400").text).toBe("#141512");
    expect(readableTextOn("#1e3a8a").text).toBe("#ffffff");
  });
});
