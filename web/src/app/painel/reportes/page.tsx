import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Card } from "@/components/Card/Card";
import { requireEditor } from "@/lib/editorial/session";
import { deadlineText } from "@/lib/reports/deadline";
import { panelReports } from "@/lib/reports/queries";
import { KIND_LABEL, STATUS_LABEL, todayInBrasilia } from "@/lib/reports/rules";
import { formatDate } from "@/lib/works/format";

import styles from "../painel.module.css";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportsPage() {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando os reportes…</p>}>
      <Reports />
    </Suspense>
  );
}

async function Reports() {
  await requireEditor();
  const items = await panelReports();
  const today = todayInBrasilia();
  return (
    <>
      <p>
        <Link href="/painel">← Fila de resumos</Link>
      </p>
      <h1 className={styles.title}>Reportes</h1>
      <p className={styles.note}>
        Abertos primeiro, pelo prazo; depois os fechados nos últimos 30 dias.
      </p>
      <ul className={styles.list} data-testid="fila-reportes">
        {items.map((r) => {
          const due = deadlineText(r, today);
          return (
            <li key={r.id}>
              <Card>
                <p>
                  <strong>Nº {r.id}</strong> · {KIND_LABEL[r.kind]} ·{" "}
                  {STATUS_LABEL[r.status]}
                  {due ? ` · ${due}` : ""}
                </p>
                <p className={styles.note}>
                  {r.pagePath} · recebido em {formatDate(r.createdAt)}
                </p>
                <p>
                  <Link href={`/painel/reportes/${r.id}`}>
                    Analisar o nº {r.id}
                  </Link>
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
      {items.length === 0 ? <p>Nenhum reporte.</p> : null}
    </>
  );
}
