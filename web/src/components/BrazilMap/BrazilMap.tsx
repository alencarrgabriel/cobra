import Link from "next/link";

import { UfFlag } from "@/components/UfFlag/UfFlag";
import { BR_MAP, MAP_STATES } from "@/lib/geo/br-map";
import { formatDate } from "@/lib/works/format";

import styles from "./BrazilMap.module.css";

/**
 * Map of Brazil where each UF leads to its representatives (RF-31, change mapa-do-brasil,
 * design D2). Rendered on the server, no JavaScript; every state has the same color.
 */
export function BrazilMap() {
  return (
    <div className={styles.wrap}>
      <figure className={styles.figure}>
        <svg
          viewBox={BR_MAP.viewBox}
          className={styles.map}
          role="group"
          aria-label="Mapa do Brasil: toque num estado para ver a bancada"
        >
          {MAP_STATES.map((s) => (
            <a
              key={s.uf}
              href={`/representantes/${s.code}`}
              aria-label={`${s.name}: ver a bancada`}
              className={styles.state}
            >
              <title>{s.name}</title>
              <path d={s.d} />
            </a>
          ))}
        </svg>
        <figcaption className={styles.source}>
          Malha das UFs: {BR_MAP.source}, obtida em{" "}
          {formatDate(BR_MAP.retrievedAt)}.
        </figcaption>
      </figure>
      <nav aria-label="Estados" className={styles.listNav}>
        <ul className={styles.list} data-testid="lista-de-estados">
          {MAP_STATES.map((s) => (
            <li key={s.uf}>
              <Link href={`/representantes/${s.code}`} className={styles.item}>
                <UfFlag uf={s.uf} decorative />
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
