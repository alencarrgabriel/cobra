// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkStatus } from "./WorkStatus";

const TODAY = new Date(2026, 9, 26);

describe("WorkStatus", () => {
  it("shows the label and the status color token", () => {
    const { container } = render(<WorkStatus status="completed" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.textContent).toBe("Concluída");
    expect(badge.style.getPropertyValue("--status")).toBe("var(--work-done)");
  });

  it("shows how long a stopped work has been stopped", () => {
    const { container } = render(
      <WorkStatus status="stopped" stoppedSince="2025-05-07" today={TODAY} />,
    );
    expect(container.textContent).toBe("Paralisada, há 17 meses");
  });

  it("ignores the stoppage date for works that are not stopped", () => {
    const { container } = render(
      <WorkStatus
        status="in_progress"
        stoppedSince="2025-05-07"
        today={TODAY}
      />,
    );
    expect(container.textContent).toBe("Em execução");
  });
});
