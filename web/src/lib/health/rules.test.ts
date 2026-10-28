import { describe, expect, it } from "vitest";

import { healthOf, needsAlert } from "./rules";

const now = new Date("2026-06-10T12:00:00Z");
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 3_600_000).toISOString();

describe("healthOf", () => {
  it("has no collection without any run", () => {
    expect(
      healthOf(
        "camara",
        { lastRun: null, lastSuccessAt: null, recentFailures: 0 },
        now,
      ),
    ).toBe("sem_coleta");
  });

  it("fails on a failed last run or recent failed jobs", () => {
    expect(
      healthOf(
        "senado",
        {
          lastRun: { status: "failed" },
          lastSuccessAt: hoursAgo(2),
          recentFailures: 0,
        },
        now,
      ),
    ).toBe("com_falha");
    expect(
      healthOf(
        "senado",
        {
          lastRun: { status: "ok" },
          lastSuccessAt: hoursAgo(2),
          recentFailures: 1,
        },
        now,
      ),
    ).toBe("com_falha");
  });

  it("is late past the source's target", () => {
    const ok = { lastRun: { status: "ok" as const }, recentFailures: 0 };
    expect(
      healthOf("camara", { ...ok, lastSuccessAt: hoursAgo(25) }, now),
    ).toBe("atrasada");
    expect(
      healthOf("camara", { ...ok, lastSuccessAt: hoursAgo(23) }, now),
    ).toBe("em_dia");
    // The TSE publishes now and then: 30 days.
    expect(
      healthOf("tse", { ...ok, lastSuccessAt: hoursAgo(24 * 20) }, now),
    ).toBe("em_dia");
    expect(
      healthOf("tse", { ...ok, lastSuccessAt: hoursAgo(24 * 31) }, now),
    ).toBe("atrasada");
  });

  it("alerts only on failure or delay", () => {
    expect(needsAlert("com_falha")).toBe(true);
    expect(needsAlert("atrasada")).toBe(true);
    expect(needsAlert("em_dia")).toBe(false);
    expect(needsAlert("sem_coleta")).toBe(false);
  });
});
