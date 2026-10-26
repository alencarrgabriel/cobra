"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useRef, useState } from "react";

import type { WorkFeatureCollection } from "@/lib/works/geojson";

import styles from "./WorksMap.module.css";

// MapLibre only loads in the browser, after the page content (design D3 of mapa-de-obras).
const WorksMapInteractive = dynamic(() => import("./WorksMapInteractive"), {
  ssr: false,
});

type State = "waiting" | "loading" | "ready" | "failed";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Shows the server-rendered map (children) until the interactive map is ready. Without
 * JavaScript or WebGL, or if the street map fails to load, the server map stays.
 */
export function MapSwitcher({
  geojson,
  children,
}: {
  geojson: WorkFeatureCollection;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("waiting");

  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsWebGL()) return;
    // Created only when the map scrolls into view, so it never competes with the main content.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          setState("loading");
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.switcher} data-map-state={state}>
      <div className={state === "ready" ? styles.hidden : undefined}>
        {children}
      </div>
      {state === "loading" || state === "ready" ? (
        <WorksMapInteractive
          geojson={geojson}
          className={state === "ready" ? styles.interactive : styles.pending}
          onReady={() => setState("ready")}
          onFail={() => setState("failed")}
        />
      ) : null}
    </div>
  );
}
