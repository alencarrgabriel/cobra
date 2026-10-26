import { describe, expect, it } from "vitest";

import {
  formatBRL,
  formatBRLCompact,
  formatDate,
  monthsAgoLabel,
  monthsSince,
} from "./format";

// Intl uses a non-breaking space between "R$" and the number.
const plain = (s: string) => s.replace(/ /g, " ");

describe("values in reais", () => {
  it("formats compact values for lists", () => {
    expect(formatBRLCompact(1_234_567)).toBe("R$ 1,2 mi");
    expect(formatBRLCompact(78_912_000_000)).toBe("R$ 78,9 bi");
    expect(formatBRLCompact(600_000)).toBe("R$ 600 mil");
    expect(formatBRLCompact(5_960_000)).toBe("R$ 6 mi");
    expect(formatBRLCompact(78_859_000_000)).toBe("R$ 78,9 bi");
    expect(plain(formatBRLCompact(950))).toBe("R$ 950,00");
  });

  it("formats full values for the work page", () => {
    expect(plain(formatBRL(5_900_000))).toBe("R$ 5.900.000,00");
  });
});

describe("dates and months", () => {
  it("formats ISO dates without time zone shifts", () => {
    expect(formatDate("2025-05-07")).toBe("07/05/2025");
    expect(formatDate("2026-10-23 00:00:00+00")).toBe("23/10/2026");
  });

  it("counts whole months since a date", () => {
    const today = new Date(2026, 9, 26);
    expect(monthsSince("2025-05-07", today)).toBe(17);
    expect(monthsSince("2026-09-27", today)).toBe(0);
    expect(monthsSince("2026-09-26", today)).toBe(1);
    expect(monthsSince("2027-01-01", today)).toBe(0);
  });

  it("writes the months in Portuguese", () => {
    expect(monthsAgoLabel(0)).toBe("há menos de 1 mês");
    expect(monthsAgoLabel(1)).toBe("há 1 mês");
    expect(monthsAgoLabel(17)).toBe("há 17 meses");
  });
});
