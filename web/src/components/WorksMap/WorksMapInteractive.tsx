"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { layers, namedFlavor } from "@protomaps/basemaps";
import * as maplibregl from "maplibre-gl";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  StyleSpecification,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useRef } from "react";

import { WORK_STATUSES } from "@/lib/works/filters";
import type {
  WorkFeatureCollection,
  WorkFeatureProps,
} from "@/lib/works/geojson";
import {
  formatBRLCompact,
  formatInteger,
  STATUS_INFO,
} from "@/lib/works/format";

import styles from "./WorksMap.module.css";

// Interactive street map of the works (design D1, D4–D6 of mapa-de-obras). Everything it
// loads comes from this site: street map (PMTiles), glyphs, icons and the MapLibre worker.

const DF_BOUNDS: [[number, number], [number, number]] = [
  [-48.32, -16.07],
  [-47.28, -15.48],
];
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-48.35, -16.1],
  [-47.25, -15.45],
];
const ATTRIBUTION =
  '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const LOCALE: Record<string, string> = {
  "AttributionControl.ToggleAttribution": "Mostrar créditos",
  "CooperativeGesturesHandler.WindowsHelpText":
    "Use Ctrl + rolagem para aproximar o mapa",
  "CooperativeGesturesHandler.MacHelpText":
    "Use ⌘ + rolagem para aproximar o mapa",
  "CooperativeGesturesHandler.MobileHelpText":
    "Use dois dedos para mover o mapa",
  "Map.Title": "Mapa das obras",
  "NavigationControl.ResetBearing": "Voltar o norte para cima",
  "NavigationControl.ZoomIn": "Aproximar",
  "NavigationControl.ZoomOut": "Afastar",
  "Popup.Close": "Fechar resumo",
};

let protocolAdded = false;

function registerOnce() {
  if (protocolAdded) return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  maplibregl.setWorkerUrl(
    `${window.location.origin}/mapa/lib/maplibre-gl-worker.mjs`,
  );
  protocolAdded = true;
}

const isDark = () => {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function baseStyle(dark: boolean): StyleSpecification {
  const origin = window.location.origin;
  const flavor = dark ? "dark" : "light";
  return {
    version: 8,
    glyphs: `${origin}/mapa/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/mapa/sprites/${flavor}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${origin}/mapa/df.pmtiles`,
        attribution: ATTRIBUTION,
      },
    },
    layers: layers("protomaps", namedFlavor(flavor), { lang: "pt" }),
  };
}

function statusColor(): ExpressionSpecification {
  const cases = WORK_STATUSES.flatMap((s) => [
    s,
    token(STATUS_INFO[s].color.slice(4, -1)),
  ]);
  return [
    "match",
    ["get", "status"],
    ...cases,
    token("--work-idle"),
  ] as unknown as ExpressionSpecification;
}

function addWorks(map: maplibregl.Map, geojson: WorkFeatureCollection) {
  map.addSource("works", {
    type: "geojson",
    data: geojson,
    cluster: true,
    clusterRadius: 40,
    clusterMaxZoom: 14,
  });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "works",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": token("--fg"),
      "circle-radius": [
        "step",
        ["get", "point_count"],
        14,
        10,
        18,
        50,
        23,
        200,
        28,
      ],
      "circle-stroke-color": token("--surface"),
      "circle-stroke-width": 2,
      "circle-opacity": 0.85,
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "works",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Medium"],
      "text-size": 12,
    },
    paint: { "text-color": token("--bg") },
  });
  map.addLayer({
    id: "works",
    type: "circle",
    source: "works",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": statusColor(),
      "circle-radius": 7,
      "circle-stroke-color": token("--surface"),
      "circle-stroke-width": 2,
    },
  });
}

/**
 * Summary of a work, built with DOM nodes and textContent (never innerHTML). MapLibre drops
 * null properties, so missing numbers arrive as undefined.
 */
function summary(p: WorkFeatureProps): HTMLElement {
  const root = document.createElement("div");
  root.className = styles.popup;
  const name = document.createElement("p");
  name.className = styles.popupName;
  name.textContent = p.name;
  const status = document.createElement("p");
  status.className = styles.popupStatus;
  status.style.setProperty("--status", STATUS_INFO[p.status].color);
  status.textContent = STATUS_INFO[p.status].label;
  const meta = document.createElement("p");
  meta.textContent = [
    p.plannedValue != null
      ? formatBRLCompact(p.plannedValue)
      : "valor não informado",
    p.progress != null ? `${formatInteger(p.progress)}% executado` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const link = document.createElement("a");
  link.href = `/obras/${encodeURIComponent(p.code)}`;
  link.textContent = "Ver ficha da obra";
  root.append(name, status, meta, link);
  return root;
}

type Props = {
  geojson: WorkFeatureCollection;
  className?: string;
  onReady: () => void;
  onFail: () => void;
};

export default function WorksMapInteractive({
  geojson,
  className,
  onReady,
  onFail,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const dataRef = useRef(geojson);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let map: maplibregl.Map;
    try {
      registerOnce();
      map = new maplibregl.Map({
        container,
        style: baseStyle(isDark()),
        bounds: DF_BOUNDS,
        maxBounds: MAX_BOUNDS,
        minZoom: 8,
        maxZoom: 18,
        attributionControl: { compact: true },
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        locale: LOCALE,
      });
    } catch {
      onFail();
      return;
    }
    mapRef.current = map;
    // Lets browser tests find the map; not used by the site itself.
    (container as HTMLDivElement & { cobraMap?: maplibregl.Map }).cobraMap =
      map;
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    let ready = false;
    const failTimer = window.setTimeout(() => {
      if (!ready) onFail();
    }, 15000);
    map.on("error", () => {
      if (!ready) onFail();
    });
    // Works layers are added on every style load, so they come back after a theme change.
    map.on("style.load", () => {
      addWorks(map, dataRef.current);
    });
    map.once("idle", () => {
      ready = true;
      window.clearTimeout(failTimer);
      map.resize();
      onReady();
    });

    map.on("click", "clusters", async (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const source = map.getSource<GeoJSONSource>("works");
      const zoom = await source?.getClusterExpansionZoom(
        feature.properties.cluster_id as number,
      );
      map.easeTo({
        center: (feature.geometry as { coordinates: [number, number] })
          .coordinates,
        zoom: zoom ?? map.getZoom() + 2,
      });
    });
    map.on("click", "works", (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      new maplibregl.Popup({ offset: 10, maxWidth: "260px" })
        .setLngLat(
          (feature.geometry as { coordinates: [number, number] }).coordinates,
        )
        .setDOMContent(summary(feature.properties as WorkFeatureProps))
        .addTo(map);
    });
    for (const layer of ["clusters", "works"]) {
      map.on(
        "mouseenter",
        layer,
        () => (map.getCanvas().style.cursor = "pointer"),
      );
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }

    // Follows the site theme: the toggle sets data-theme, the system sets the media query.
    let dark = isDark();
    const retheme = () => {
      if (isDark() === dark) return;
      dark = isDark();
      map.setStyle(baseStyle(dark));
    };
    const themeObserver = new MutationObserver(retheme);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", retheme);

    return () => {
      window.clearTimeout(failTimer);
      themeObserver.disconnect();
      media.removeEventListener("change", retheme);
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; data updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New filters bring new pins without recreating the map.
  useEffect(() => {
    dataRef.current = geojson;
    mapRef.current?.getSource<GeoJSONSource>("works")?.setData(geojson);
  }, [geojson]);

  return (
    <div
      ref={ref}
      className={className}
      role="region"
      aria-label="Mapa interativo das obras. Para abrir cada obra pelo teclado, use a lista abaixo."
      data-testid="mapa-interativo"
    />
  );
}
