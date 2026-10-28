import { describe, expect, it } from "vitest";

import { addBusinessDays, pagePath, todayInBrasilia } from "./rules";

describe("addBusinessDays", () => {
  it("skips weekends", () => {
    expect(addBusinessDays("2026-06-08", 5)).toBe("2026-06-15"); // Monday → Monday
    expect(addBusinessDays("2026-06-12", 5)).toBe("2026-06-19"); // Friday → Friday
    expect(addBusinessDays("2026-06-13", 5)).toBe("2026-06-19"); // Saturday → Friday
  });

  it("crosses months and years", () => {
    expect(addBusinessDays("2026-06-29", 5)).toBe("2026-07-06");
    expect(addBusinessDays("2026-12-30", 5)).toBe("2027-01-06");
  });

  it("uses Brasília's date", () => {
    expect(todayInBrasilia(new Date("2026-06-09T02:00:00Z"))).toBe(
      "2026-06-08",
    );
  });
});

describe("pagePath", () => {
  it("keeps public data pages in canonical form", () => {
    expect(pagePath("/politicos/42-ana-silva")).toBe("/politicos/42");
    expect(pagePath("/votacoes/7?lugar=53#x")).toBe("/votacoes/7");
    expect(pagePath("/obras/900001.53-01")).toBe("/obras/900001.53-01");
    expect(pagePath("/representantes/5300108/")).toBe(
      "/representantes/5300108",
    );
    expect(pagePath("/")).toBe("/");
  });

  it("rejects private and unknown addresses", () => {
    expect(pagePath("/alertas/meus-dados/abc")).toBeNull();
    expect(pagePath("/painel/reportes")).toBeNull();
    expect(pagePath("/politicos/42-NOME QUALQUER")).toBeNull();
    expect(pagePath("https://outro.site/x")).toBeNull();
    expect(pagePath("/qualquer-coisa")).toBeNull();
  });
});

describe("deadlineText", () => {
  it("never hides a late answer", async () => {
    const { deadlineText } = await import("./deadline");
    const open = { closedAt: null, dueOn: "2026-06-15" };
    expect(deadlineText(open, "2026-06-15")).toBe("no prazo até 15/06/2026");
    expect(deadlineText(open, "2026-06-16")).toBe(
      "prazo vencido em 15/06/2026",
    );
    expect(
      deadlineText({ ...open, closedAt: "2026-06-12T10:00:00Z" }, "2026-06-20"),
    ).toBeNull();
  });
});
