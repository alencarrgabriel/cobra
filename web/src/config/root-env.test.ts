import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadRootEnv } from "./root-env";

describe("loadRootEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  function repoWithRootEnv(content: string): string {
    const root = mkdtempSync(path.join(tmpdir(), "cobra-env-"));
    writeFileSync(path.join(root, ".env"), content);
    const webDir = path.join(root, "web");
    mkdirSync(webDir);
    return webDir;
  }

  it("reads variables from the .env one level above the web directory", () => {
    vi.stubEnv("COBRA_ROOT_ENV_PROBE", undefined);
    loadRootEnv(
      repoWithRootEnv("COBRA_ROOT_ENV_PROBE=from-root\n"),
      "development",
    );
    expect(process.env.COBRA_ROOT_ENV_PROBE).toBe("from-root");
  });

  it("does not override variables already set in the environment", () => {
    vi.stubEnv("COBRA_ROOT_ENV_PROBE_2", "from-shell");
    loadRootEnv(
      repoWithRootEnv("COBRA_ROOT_ENV_PROBE_2=from-root\n"),
      "development",
    );
    expect(process.env.COBRA_ROOT_ENV_PROBE_2).toBe("from-shell");
  });
});
