// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VoteBadge, VoteSplitBar } from "./Vote";

describe("VoteBadge", () => {
  it.each([
    ["yes", "Sim"],
    ["no", "Não"],
    ["abstention", "Abstenção"],
    ["absent", "Ausente"],
  ] as const)("always shows the text for %s", (option, text) => {
    render(<VoteBadge option={option} />);
    expect(screen.getByText(text)).toBeTruthy();
  });
});

describe("VoteSplitBar", () => {
  it("describes every count for screen readers", () => {
    render(<VoteSplitBar yes={312} no={141} other={9} />);
    expect(
      screen.getByRole("img", { name: "312 Sim, 141 Não, 9 outros" }),
    ).toBeTruthy();
  });
});
