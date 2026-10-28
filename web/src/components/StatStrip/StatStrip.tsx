import Link from "next/link";

import styles from "./StatStrip.module.css";

export type Stat = {
  /** The figure, already formatted ("75%", "R$ 1,2 mi"); `null` renders "—". */
  value: string | null;
  /** What it is, in a few words. */
  label: string;
  /** The reference that gives the figure meaning (the house median, the year). */
  reference: string;
  /** Source and date; or, with no value, why there is none. */
  note: string;
  /** Tab or page with the detail. */
  href: string;
};

/**
 * A row of big numbers, always in the same order for every politician (DDR §9.1). A figure
 * without data shows "—" and the reason, never zero. Each one links to its detail.
 */
export function StatStrip({ stats, label }: { stats: Stat[]; label: string }) {
  return (
    <ul className={styles.strip} aria-label={label} data-testid="faixa">
      {stats.map((s) => (
        <li key={s.label} className={styles.item}>
          <Link href={s.href} className={styles.link} prefetch={false}>
            <span className={styles.label}>{s.label}</span>
            <span className={`display ${styles.value}`}>
              {s.value ?? (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Sem dado</span>
                </>
              )}
            </span>
            {s.value !== null ? (
              <span className={styles.reference}>{s.reference}</span>
            ) : null}
            <span className={styles.note}>{s.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
