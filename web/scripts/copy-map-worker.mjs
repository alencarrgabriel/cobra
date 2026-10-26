// Serves MapLibre's worker from the site itself (public/mapa/lib/), so the map needs no
// `blob:` worker and the CSP stays as it is (design D6 of mapa-de-obras).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const webDir = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(webDir, "package.json"));
const pkgDir = path.dirname(require.resolve("maplibre-gl/package.json"));
const { version } = JSON.parse(
  readFileSync(path.join(pkgDir, "package.json"), "utf8"),
);
const target = path.join(webDir, "public", "mapa", "lib");

mkdirSync(target, { recursive: true });
copyFileSync(
  path.join(pkgDir, "dist", "maplibre-gl-worker.mjs"),
  path.join(target, "maplibre-gl-worker.mjs"),
);
console.log(`map worker: maplibre-gl ${version} copied to public/mapa/lib/`);
