import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AA, contrastRatio, readableTextOn } from "./contrast";
import { NEUTRAL_PARTY_COLOR, partyColor } from "./party-color";

// The curated colors live in the migration; read them from there so the test follows it.
const MIGRATION = readFileSync(
  path.resolve(
    __dirname,
    "../../../supabase/migrations/20261027120000_party_colors.sql",
  ),
  "utf8",
);
const CURATED = [
  ...MIGRATION.matchAll(/\('([^']+)',\s*'(#[0-9a-f]{6})',\s*'(\w+)'/g),
].map((m) => ({ acronym: m[1], color: m[2] }));

describe("party colors", () => {
  it("reads the curated colors from the migration", () => {
    expect(CURATED.length).toBeGreaterThanOrEqual(20);
    expect(CURATED.find((c) => c.acronym === "PSB")?.color).toBe("#c41d23");
  });

  it("keeps AA contrast on the badge for every curated color and the neutral one", () => {
    for (const { acronym, color } of [
      ...CURATED,
      { acronym: "neutral", color: NEUTRAL_PARTY_COLOR },
    ]) {
      const { background, text } = readableTextOn(color);
      expect(contrastRatio(background, text), acronym).toBeGreaterThanOrEqual(
        AA,
      );
    }
  });

  it("shows a light color like PSOL's with dark text", () => {
    const { text } = readableTextOn("#ffc200");
    expect(text).not.toBe("#ffffff");
  });

  it("falls back to the neutral color, never another party's", () => {
    const colors = { PT: "#c8102e" };
    expect(partyColor(colors, "PT")).toBe("#c8102e");
    expect(partyColor(colors, "PARTIDO NOVO DE 2027")).toBe(
      NEUTRAL_PARTY_COLOR,
    );
  });
});
