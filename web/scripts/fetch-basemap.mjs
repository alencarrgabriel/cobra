// Puts the street map (PMTiles) at public/mapa/df.pmtiles after checking its SHA-256
// against basemap.json. The file is too large for Git (design D2 of mapa-de-obras).
//
// Where it comes from, in order:
//   1. BASEMAP_FILE (a local path), e.g. a fresh extract;
//   2. <repo>/data/basemap/<file>, the local copy kept out of Git;
//   3. the `url` in basemap.json, when the file is hosted.
// `--test` uses the small extract versioned in e2e/fixtures (browser tests and CI).
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const webDir = path.resolve(import.meta.dirname, "..");
const rootDir = path.resolve(webDir, "..");
const config = JSON.parse(
  readFileSync(path.join(webDir, "basemap.json"), "utf8"),
);
const test = process.argv.includes("--test");
const entry = test ? config.test : config.df;
const target = path.join(webDir, "public", "mapa", "df.pmtiles");

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function check(buffer, from) {
  const hash = sha256(buffer);
  if (hash !== entry.sha256) {
    throw new Error(
      `hash mismatch for ${from}: got ${hash}, expected ${entry.sha256}`,
    );
  }
}

async function main() {
  mkdirSync(path.dirname(target), { recursive: true });
  if (existsSync(target) && sha256(readFileSync(target)) === entry.sha256) {
    console.log(`basemap: ${path.relative(webDir, target)} already up to date`);
    return;
  }
  const candidates = test
    ? [path.join(webDir, entry.path)]
    : [
        process.env.BASEMAP_FILE,
        path.join(rootDir, "data", "basemap", entry.file),
      ].filter(Boolean);
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    check(readFileSync(file), file);
    copyFileSync(file, target);
    console.log(`basemap: copied ${file}`);
    return;
  }
  if (!test && entry.url) {
    const response = await fetch(entry.url);
    if (!response.ok)
      throw new Error(`download failed: HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    check(buffer, entry.url);
    writeFileSync(target, buffer);
    console.log(`basemap: downloaded ${entry.url}`);
    return;
  }
  throw new Error(
    `basemap not found. Set BASEMAP_FILE, put ${entry.file} in data/basemap/ ` +
      "or host it and set `url` in basemap.json (docs/mapa.md).",
  );
}

main().catch((error) => {
  console.error(`basemap: ${error.message}`);
  process.exit(1);
});
