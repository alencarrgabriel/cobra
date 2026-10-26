import boundary from "@/lib/geo/df-boundary.json";
import { fitProjection, type LonLat } from "@/lib/geo/projection";
import { WORK_STATUSES } from "@/lib/works/filters";
import { formatInteger, STATUS_INFO } from "@/lib/works/format";
import type { WorkPin } from "@/lib/works/queries";

import styles from "./WorksMap.module.css";

type Props = {
  pins: WorkPin[];
  withoutLocation: number;
};

const RING = boundary.ring as LonLat[];
const PROJECTION = fitProjection(RING, 600);
const OUTLINE = PROJECTION.path(RING);

const plural = (n: number, one: string, many: string) =>
  `${formatInteger(n)} ${n === 1 ? one : many}`;

/** Server-rendered map of the DF with one link per located work (design D5). */
export function WorksMap({ pins, withoutLocation }: Props) {
  const shown = pins.filter((p) => PROJECTION.inBounds([p.lon, p.lat]));
  const outside = pins.length - shown.length;
  const present = WORK_STATUSES.filter((s) =>
    shown.some((p) => p.status === s),
  );
  return (
    <figure className={styles.figure}>
      <svg
        className={styles.map}
        viewBox={`0 0 ${PROJECTION.width} ${PROJECTION.height}`}
        role="group"
        aria-label={`Mapa do Distrito Federal com ${plural(shown.length, "obra", "obras")}`}
      >
        <path d={OUTLINE} className={styles.outline} />
        {shown.map((p) => {
          const [x, y] = PROJECTION.project([p.lon, p.lat]);
          const info = STATUS_INFO[p.status];
          return (
            <a
              key={p.code}
              href={`/obras/${encodeURIComponent(p.code)}`}
              aria-label={`${p.name}, ${info.label}`}
              className={styles.pin}
            >
              <circle
                cx={x}
                cy={y}
                r={5}
                style={{ fill: info.color }}
                data-status={p.status}
              />
            </a>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>
        {present.length > 0 ? (
          <ul className={styles.legend} aria-label="Legenda">
            {present.map((s) => (
              <li key={s}>
                <span
                  className={styles.swatch}
                  style={{ background: STATUS_INFO[s].color }}
                  aria-hidden="true"
                />
                {STATUS_INFO[s].label}
              </li>
            ))}
          </ul>
        ) : null}
        {withoutLocation > 0 ? (
          <p data-testid="sem-localizacao">
            {plural(withoutLocation, "obra", "obras")} sem localização{" "}
            {withoutLocation === 1 ? "não aparece" : "não aparecem"} no mapa, só
            na lista.
          </p>
        ) : null}
        {outside > 0 ? (
          <p data-testid="fora-do-mapa">
            {plural(outside, "obra tem", "obras têm")} coordenadas fora do
            Distrito Federal, como informado pela fonte, e{" "}
            {outside === 1 ? "não aparece" : "não aparecem"} no mapa.
          </p>
        ) : null}
        <p className={styles.credit}>Limite do DF: IBGE.</p>
      </figcaption>
    </figure>
  );
}
