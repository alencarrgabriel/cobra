// Equirectangular projection corrected by the cosine of the mean latitude (design D5).
// Points are [longitude, latitude]; SVG y grows downwards.

export type LonLat = [number, number];

export type Projection = {
  width: number;
  height: number;
  /** Whether the point falls inside the projected bounding box. */
  inBounds: (p: LonLat) => boolean;
  project: (p: LonLat) => [number, number];
  /** SVG path of a closed ring. */
  path: (ring: LonLat[]) => string;
};

export function fitProjection(
  ring: LonLat[],
  width: number,
  padding = 12,
): Projection {
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)];
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const scale = (width - 2 * padding) / ((maxLon - minLon) * k);
  const height = Math.round((maxLat - minLat) * scale + 2 * padding);
  const round = (n: number) => Math.round(n * 10) / 10;
  const project = ([lon, lat]: LonLat): [number, number] => [
    round(padding + (lon - minLon) * k * scale),
    round(padding + (maxLat - lat) * scale),
  ];
  return {
    width,
    height,
    inBounds: ([lon, lat]) =>
      lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat,
    project,
    path: (r) =>
      r
        .map((p, i) => {
          const [x, y] = project(p);
          return `${i === 0 ? "M" : "L"}${x} ${y}`;
        })
        .join("") + "Z",
  };
}

/** Ray casting: whether a point lies inside a closed ring. */
export function insideRing([x, y]: LonLat, ring: LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
