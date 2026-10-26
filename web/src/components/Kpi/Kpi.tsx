import styles from "./Kpi.module.css";

type Props = {
  value: string;
  unit?: string;
  label: string;
  /** Comparison shown with every number (DDR §9.1): house median, quota limit or previous value. */
  reference: { label: string; position?: number };
  /** Fill of the bar, 0–1. Omit for numbers without a natural scale. */
  share?: number;
  source: string;
};

const pct = (n: number) =>
  `${Math.round(Math.min(1, Math.max(0, n)) * 1000) / 10}%`;

/** Highlighted number with its reference and source. It never labels the value as good or bad. */
export function Kpi({ value, unit, label, reference, share, source }: Props) {
  return (
    <div className={styles.kpi}>
      <p className={styles.value}>
        {value}
        {unit ? <small>{unit}</small> : null}
      </p>
      <p className={styles.label}>{label}</p>
      {share !== undefined ? (
        <div className={styles.bar} aria-hidden="true">
          <span className={styles.fill} style={{ width: pct(share) }} />
          {reference.position !== undefined ? (
            <i
              className={styles.mark}
              data-testid="reference-mark"
              style={{ left: pct(reference.position) }}
            />
          ) : null}
        </div>
      ) : null}
      <p className={styles.reference}>{reference.label}</p>
      <p className={styles.source}>Fonte: {source}</p>
    </div>
  );
}
