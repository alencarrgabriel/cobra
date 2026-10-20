import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: async () => {} }));

import { GET } from "./route";

describe("GET /api/health", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("answers ok with the version, without a database configured", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      status: "ok",
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
