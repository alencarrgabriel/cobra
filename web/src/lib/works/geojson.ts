import type { WorkStatus } from "./filters";
import type { WorkPin } from "./queries";

// Pins of the interactive map (design D3 of mapa-de-obras): plain GeoJSON, built on the server
// from the same filtered query as the list, and passed to the client map as a prop.

export type WorkFeatureProps = {
  code: string;
  name: string;
  status: WorkStatus;
  plannedValue: number | null;
  progress: number | null;
};

export type WorkFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: WorkFeatureProps;
  }[];
};

export function pinsToGeoJSON(pins: WorkPin[]): WorkFeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          code: p.code,
          name: p.name,
          status: p.status,
          plannedValue: p.plannedValue,
          progress: p.progress,
        },
      })),
  };
}
