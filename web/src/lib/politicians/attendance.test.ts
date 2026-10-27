import { describe, expect, it } from "vitest";

import { median, percent } from "./attendance";

describe("attendance", () => {
  it("takes the median of odd and even lists", () => {
    expect(median([0.9, 0.5, 0.7])).toBe(0.7);
    expect(median([0.9, 0.5, 0.7, 1])).toBe(0.8);
  });

  it("formats a share as whole percent", () => {
    expect(percent(110 / 121)).toBe("91%");
  });
});
