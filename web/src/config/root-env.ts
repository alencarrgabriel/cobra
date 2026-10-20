import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

/**
 * Loads the repository root `.env*` files (shared by site and collectors) into `process.env`,
 * with the same precedence as Next.js. Variables already set in the environment win.
 *
 * `@next/env` is not used here: it caches its first load per process and would silently
 * skip the root directory once Next.js has loaded `web/`.
 */
export function loadRootEnv(
  webDir: string,
  mode = process.env.NODE_ENV ?? "development",
): void {
  const rootDir = path.resolve(webDir, "..");
  const files = [
    `.env.${mode}.local`,
    ...(mode === "test" ? [] : [".env.local"]),
    `.env.${mode}`,
    ".env",
  ];
  for (const file of files) {
    const fullPath = path.join(rootDir, file);
    if (!existsSync(fullPath)) continue;
    for (const [key, value] of Object.entries(
      parseEnv(readFileSync(fullPath, "utf8")),
    )) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
