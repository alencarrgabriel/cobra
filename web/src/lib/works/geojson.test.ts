import { describe, expect, it } from "vitest";

import { pinsToGeoJSON } from "./geojson";

const pin = {
  code: "900002.53-02",
  name: "UBS de Teste",
  status: "stopped" as const,
  lat: -15.83,
  lon: -48.13,
  plannedValue: 5_900_000,
  progress: 42,
};

describe("pinsToGeoJSON", () => {
  it("puts longitude first, as GeoJSON requires", () => {
    const fc = pinsToGeoJSON([pin]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features[0].geometry).toEqual({
      type: "Point",
      coordinates: [-48.13, -15.83],
    });
  });

  it("carries what the pin summary shows", () => {
    expect(pinsToGeoJSON([pin]).features[0].properties).toEqual({
      code: "900002.53-02",
      name: "UBS de Teste",
      status: "stopped",
      plannedValue: 5_900_000,
      progress: 42,
    });
  });

  it("skips pins without valid coordinates instead of inventing a place", () => {
    const fc = pinsToGeoJSON([pin, { ...pin, code: "x", lat: Number.NaN }]);
    expect(fc.features.map((f) => f.properties.code)).toEqual(["900002.53-02"]);
  });
});
