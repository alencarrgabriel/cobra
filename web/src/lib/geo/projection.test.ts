import { describe, expect, it } from "vitest";

import boundary from "./df-boundary.json";
import { fitProjection, insideRing, type LonLat } from "./projection";

const RING = boundary.ring as LonLat[];

describe("DF projection", () => {
  const proj = fitProjection(RING, 600);

  it("keeps the DF shape wider than tall, within the canvas", () => {
    expect(proj.height).toBeGreaterThan(200);
    expect(proj.height).toBeLessThan(600);
    for (const p of RING) {
      const [x, y] = proj.project(p);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(proj.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(proj.height);
    }
  });

  it("places a work in Ceilândia inside the projected DF outline", () => {
    const ceilandia: LonLat = [-48.1, -15.82];
    expect(insideRing(ceilandia, RING)).toBe(true);
    const projected = RING.map((p) => proj.project(p));
    expect(insideRing(proj.project(ceilandia), projected)).toBe(true);
  });

  it("puts north up and west on the left", () => {
    const [xWest] = proj.project([-48.2, -15.8]);
    const [xEast] = proj.project([-47.4, -15.8]);
    const [, yNorth] = proj.project([-47.9, -15.55]);
    const [, ySouth] = proj.project([-47.9, -16.0]);
    expect(xWest).toBeLessThan(xEast);
    expect(yNorth).toBeLessThan(ySouth);
  });

  it("tells points outside the DF bounding box", () => {
    expect(proj.inBounds([-47.9, -15.8])).toBe(true);
    expect(proj.inBounds([-46.6, -23.55])).toBe(false);
    expect(insideRing([-46.6, -23.55], RING)).toBe(false);
  });
});
