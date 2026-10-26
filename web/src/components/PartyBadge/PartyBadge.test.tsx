// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PartyBadge } from "./PartyBadge";

describe("PartyBadge", () => {
  it("renders every party with the same element, class and style keys", () => {
    const { container } = render(
      <>
        <PartyBadge acronym="PT" color="#c8102e" />
        <PartyBadge acronym="REPUBLICANOS" color="#1d4ed8" />
        <PartyBadge acronym="NOVO" color="#f97316" />
      </>,
    );
    const badges = [
      ...container.querySelectorAll("span[style]"),
    ] as HTMLElement[];
    expect(badges).toHaveLength(3);
    expect(new Set(badges.map((b) => b.className)).size).toBe(1);
    for (const b of badges)
      expect(Object.values(b.style)).toEqual(["background-color", "color"]);
  });

  it("keeps the full party name available to screen readers", () => {
    const { container } = render(
      <PartyBadge
        acronym="PSD"
        color="#d97706"
        name="Partido Social Democrático"
      />,
    );
    expect(container.textContent).toBe("PSD (Partido Social Democrático)");
  });
});
