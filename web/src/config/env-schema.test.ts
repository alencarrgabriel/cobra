import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  parseEnv,
  publicEnvSchema,
  serverEnvSchema,
} from "./env-schema";

describe("parseEnv", () => {
  it("accepts a valid configuration and applies defaults", () => {
    const env = parseEnv(serverEnvSchema, { APP_ENV: "production" });
    expect(env).toEqual({ APP_ENV: "production", LOG_LEVEL: "info" });
  });

  it("names a missing required variable", () => {
    expect(() => parseEnv(serverEnvSchema, {})).toThrow(/APP_ENV: is required/);
  });

  it("treats an empty value as missing", () => {
    expect(() => parseEnv(serverEnvSchema, { APP_ENV: "" })).toThrow(
      /APP_ENV: is required/,
    );
  });

  it("never echoes the invalid value", () => {
    const secretLooking = "sk_live_should_never_be_printed";
    try {
      parseEnv(serverEnvSchema, {
        APP_ENV: "production",
        APP_COMMIT_SHA: secretLooking,
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const message = (error as Error).message;
      expect(message).toContain("APP_COMMIT_SHA");
      expect(message).not.toContain(secretLooking);
      expect((error as EnvValidationError).variables).toEqual([
        "APP_COMMIT_SHA",
      ]);
    }
  });
});

describe(".env.example", () => {
  const example = readFileSync(
    path.resolve(import.meta.dirname, "../../../.env.example"),
    "utf8",
  );
  const documented = new Set(
    example
      .split(/\r?\n/)
      .map((line) => /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
      .filter((name): name is string => Boolean(name)),
  );

  it.each([
    ...Object.keys(serverEnvSchema.shape),
    ...Object.keys(publicEnvSchema.shape),
  ])("documents %s", (name) => {
    expect(
      documented.has(name),
      `${name} is read by the site but missing from .env.example`,
    ).toBe(true);
  });
});
