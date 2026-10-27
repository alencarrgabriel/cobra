import type { Excerpt as Segments } from "@/lib/plans/excerpt";

import styles from "./planos.module.css";

/** A literal excerpt of the PDF text, with the matched words highlighted. */
export function Excerpt({ segments }: { segments: Segments }) {
  return (
    <p className={styles.excerpt}>
      {segments.map((s, i) =>
        s.mark ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>,
      )}
    </p>
  );
}
