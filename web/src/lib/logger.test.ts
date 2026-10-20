import { describe, expect, it } from "vitest";

import { createLogger } from "./logger";

describe("createLogger", () => {
  it("writes one JSON object per event with time, level and fields", () => {
    const lines: string[] = [];
    createLogger("debug", (line) => lines.push(line)).info(
      "collector finished",
      { source: "camara" },
    );

    expect(lines).toHaveLength(1);
    const event = JSON.parse(lines[0]!);
    expect(event).toMatchObject({
      level: "info",
      message: "collector finished",
      source: "camara",
    });
    expect(Number.isNaN(Date.parse(event.time))).toBe(false);
  });

  it("drops events below the minimum level", () => {
    const lines: string[] = [];
    const log = createLogger("warn", (line) => lines.push(line));
    log.debug("a");
    log.info("b");
    log.warn("c");
    log.error("d");

    expect(lines.map((l) => JSON.parse(l).message)).toEqual(["c", "d"]);
  });
});
