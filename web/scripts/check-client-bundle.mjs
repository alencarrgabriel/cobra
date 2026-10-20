// Fails if the value of any server-only variable documented in `.env.example`
// appears in the browser bundle (`.next/static`). Run after `next build`.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import nextEnv from "@next/env";

const webDir = path.resolve(import.meta.dirname, "..");
const rootDir = path.resolve(webDir, "..");
nextEnv.loadEnvConfig(rootDir, false, { info: () => {}, error: console.error });

const documented = readFileSync(path.join(rootDir, ".env.example"), "utf8")
  .split(/\r?\n/)
  .map((line) => /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
  .filter(Boolean);

// Short or enum-like values (e.g. "development") match by chance; only check distinctive ones.
const secrets = documented
  .filter((name) => !name.startsWith("NEXT_PUBLIC_"))
  .map((name) => [name, process.env[name]])
  .filter(([, value]) => typeof value === "string" && value.length >= 16);

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else yield full;
  }
}

const leaks = [];
for (const file of files(path.join(webDir, ".next", "static"))) {
  const content = readFileSync(file, "utf8");
  for (const [name, value] of secrets) {
    if (content.includes(value))
      leaks.push(`${name} found in ${path.relative(webDir, file)}`);
  }
}

if (leaks.length > 0) {
  console.error(
    `Server-only values leaked into the browser bundle:\n  ${leaks.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(
  `Browser bundle clean (${secrets.length} server-only values checked).`,
);
