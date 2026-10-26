import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Components must take every color from the tokens in app/globals.css (RNF-20).
const SRC = path.resolve(import.meta.dirname, "..");
const LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/gi;

function cssModules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssModules(full);
    return entry.name.endsWith(".module.css") ? [full] : [];
  });
}

export function literalColors(css: string): string[] {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").match(LITERAL) ?? [];
}

describe("CSS modules", () => {
  it("detects literal colors", () => {
    expect(
      literalColors(".a { color: #fff; background: rgb(0 0 0); }"),
    ).toEqual(["#fff", "rgb("]);
    expect(
      literalColors(".a { color: var(--fg); background: transparent; }"),
    ).toEqual([]);
  });

  it.each(cssModules(SRC).map((f) => [path.relative(SRC, f), f]))(
    "%s uses only tokens",
    (_, file) => {
      expect(literalColors(readFileSync(file, "utf8"))).toEqual([]);
    },
  );
});
