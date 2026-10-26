import { afterEach, describe, expect, it, vi } from "vitest";

describe("db", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reports data as unavailable when WEB_DATABASE_URL is not set", async () => {
    vi.stubEnv("WEB_DATABASE_URL", "");
    const { db, DataUnavailableError } = await import("./db");
    expect(() => db()).toThrow(DataUnavailableError);
  });

  it("turns an unreachable database into DataUnavailableError", async () => {
    vi.stubEnv(
      "WEB_DATABASE_URL",
      "postgresql://user:pass@127.0.0.1:1/nothing",
    );
    const { withDb, DataUnavailableError } = await import("./db");
    await expect(withDb((sql) => sql`select 1`)).rejects.toBeInstanceOf(
      DataUnavailableError,
    );
  });

  it("reports an unavailable database as a value and unwraps it back", async () => {
    vi.stubEnv("WEB_DATABASE_URL", "");
    const { tryDb, unwrap, DataUnavailableError } = await import("./db");
    const result = await tryDb((sql) => sql`select 1`);
    expect(result).toEqual({
      ok: false,
      unavailable: "WEB_DATABASE_URL is not set",
    });
    expect(() => unwrap(result)).toThrow(DataUnavailableError);
    expect(unwrap({ ok: true, value: 1 })).toBe(1);
  });
});
