import Link from "next/link";

import styles from "@/app/alertas/alertas.module.css";
import { deadlineText } from "@/lib/reports/deadline";
import type { PublicReport } from "@/lib/reports/queries";
import { KIND_LABEL, STATUS_LABEL } from "@/lib/reports/rules";
import { formatDate } from "@/lib/works/format";

/** One report of the public queue: never the description or the contact (design D4). */
export function ReportItem({ r, today }: { r: PublicReport; today: string }) {
  const due = deadlineText(r, today);
  return (
    <article className={styles.prose} data-testid="reporte-publico">
      <h2 className={styles.h2}>
        <Link href={`/correcoes/${r.id}`}>Protocolo nº {r.id}</Link>
      </h2>
      <dl className={styles.data}>
        <dt>Página</dt>
        <dd>
          {r.pagePath === "/" ? (
            "o Cobra em geral"
          ) : (
            <Link href={r.pagePath}>{r.pagePath}</Link>
          )}
        </dd>
        <dt>Tipo</dt>
        <dd>{KIND_LABEL[r.kind]}</dd>
        <dt>Recebido em</dt>
        <dd>{formatDate(r.createdAt)}</dd>
        <dt>Situação</dt>
        <dd data-testid="situacao">
          {STATUS_LABEL[r.status]}
          {r.closedAt ? `, em ${formatDate(r.closedAt)}` : ""}
          {due ? ` (${due})` : ""}
        </dd>
        {r.publicNote ? (
          <>
            <dt>Nota da equipe</dt>
            <dd data-testid="nota-publica">{r.publicNote}</dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}
