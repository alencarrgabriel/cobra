// Builds src/lib/geo/br-map.json, the map of Brazil on the home page (change mapa-do-brasil,
// design D1): the official IBGE mesh of the 27 UFs, projected once into SVG paths, so the site
// never calls the IBGE at runtime. Run again only to refresh: `node scripts/build-br-map.mjs`.
//
// Source: IBGE, API de malhas geográficas v3 (servicodados.ibge.gov.br/api/docs/malhas?versao=3).
import { writeFileSync } from "node:fs";
import path from "node:path";

const URL_MESH =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF";

// IBGE code → UF abbreviation.
const UF = {
  11: "RO",
  12: "AC",
  13: "AM",
  14: "RR",
  15: "PA",
  16: "AP",
  17: "TO",
  21: "MA",
  22: "PI",
  23: "CE",
  24: "RN",
  25: "PB",
  26: "PE",
  27: "AL",
  28: "SE",
  29: "BA",
  31: "MG",
  32: "ES",
  33: "RJ",
  35: "SP",
  41: "PR",
  42: "SC",
  43: "RS",
  50: "MS",
  51: "MT",
  52: "GO",
  53: "DF",
};

const SCALE = 25; // pixels per degree of latitude
const response = await fetch(URL_MESH, {
  headers: { Accept: "application/vnd.geo+json" },
});
if (!response.ok) throw new Error(`IBGE answered ${response.status}`);
const mesh = await response.json();
if (mesh.features?.length !== 27) throw new Error("expected 27 UFs");

const rings = (geometry) =>
  geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.coordinates.flat();

let minLon = Infinity,
  maxLon = -Infinity,
  minLat = Infinity,
  maxLat = -Infinity;
for (const f of mesh.features)
  for (const ring of rings(f.geometry))
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

// Equirectangular, with longitude shrunk by the cosine of the middle latitude.
const kx = SCALE * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const round = (n) => Math.round(n * 10) / 10;
const project = ([lon, lat]) => [
  round((lon - minLon) * kx),
  round((maxLat - lat) * SCALE),
];

const states = {};
for (const f of mesh.features) {
  const uf = UF[f.properties.codarea];
  if (!uf) throw new Error(`unknown UF code ${f.properties.codarea}`);
  const d = rings(f.geometry)
    .map((ring) => {
      const points = ring.map(project);
      return `M${points.map((p) => p.join(",")).join("L")}Z`;
    })
    .join("");
  states[uf] = { code: String(f.properties.codarea), d };
}

const out = {
  source: "IBGE, API de malhas geográficas v3",
  sourceUrl: URL_MESH,
  retrievedAt: new Date().toISOString().slice(0, 10),
  viewBox: `0 0 ${Math.ceil((maxLon - minLon) * kx)} ${Math.ceil((maxLat - minLat) * SCALE)}`,
  states: Object.fromEntries(
    Object.entries(states).sort(([a], [b]) => a.localeCompare(b)),
  ),
};
const target = path.resolve(
  import.meta.dirname,
  "..",
  "src",
  "lib",
  "geo",
  "br-map.json",
);
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `wrote ${target} (${Object.keys(states).length} UFs, ${out.viewBox})`,
);
