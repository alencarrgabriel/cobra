// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FLAGS, flagAlt, UF_ABBRS } from "@/lib/geo/flags";

import { UfFlag } from "./UfFlag";

const PUBLIC = path.resolve(__dirname, "../../../public/bandeiras");

describe("UfFlag", () => {
  it("shows the flag served by the site with its alternative text", () => {
    const { getByRole } = render(<UfFlag uf="DF" />);
    const img = getByRole("img");
    expect(img.getAttribute("src")).toBe("/bandeiras/DF.svg");
    expect(img.getAttribute("alt")).toBe("Bandeira do Distrito Federal");
  });

  it("uses the right preposition for every state", () => {
    expect(flagAlt("SP")).toBe("Bandeira de São Paulo");
    expect(flagAlt("BA")).toBe("Bandeira da Bahia");
    expect(() => flagAlt("XX")).toThrow();
  });
});

describe("flag files", () => {
  it("has the 27 states", () => {
    expect(UF_ABBRS).toHaveLength(27);
  });

  it("matches the recorded hash, license and source, and has no script", () => {
    for (const uf of UF_ABBRS) {
      const info = FLAGS[uf];
      const data = readFileSync(path.join(PUBLIC, info.file));
      expect(createHash("sha256").update(data).digest("hex"), uf).toBe(
        info.sha256,
      );
      expect(info.license, uf).toBe("Public domain");
      expect(info.commonsPage, uf).toMatch(
        /^https:\/\/commons\.wikimedia\.org\//,
      );
      const text = data.toString("utf8");
      expect(text, uf).not.toMatch(/<script/i);
      expect(text, uf).not.toMatch(/\son[a-z]+\s*=/i);
    }
  });
});
