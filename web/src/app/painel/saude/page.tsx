import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireEditor } from "@/lib/editorial/session";
import { integrationHealth } from "@/lib/health/queries";
import {
  HEALTH_LABEL,
  type HealthStatus,
  SOURCE_NAME,
  type Source,
} from "@/lib/health/rules";
import { formatInteger } from "@/lib/works/format";

import styles from "../painel.module.css";

export const metadata: Metadata = { title: "Saúde das integrações" };

const RUN_LABEL = {
  running: "rodando",
  ok: "ok",
  partial: "parcial",
  failed: "falhou",
};

// Text and a mark, never color alone (design D2).
const MARK: Record<HealthStatus, string> = {
  em_dia: "✓",
  atrasada: "!",
  com_falha: "✗",
  sem_coleta: "—",
};

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(iso))
    : "—";

export default function HealthPage() {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <Health />
    </Suspense>
  );
}

async function Health() {
  await requireEditor();
  const { sources, failures } = await integrationHealth();
  return (
    <>
      <p>
        <Link href="/painel">← Fila de resumos</Link>
      </p>
      <h1 className={styles.title}>Saúde das integrações</h1>
      <p className={styles.note}>
        Situação de cada fonte pelo registro do coletor. Atrasada: o último
        sucesso passou de 1 dia (30 dias para TSE e IBGE). Com falha: a última
        execução falhou ou há tarefas com falha nos últimos 7 dias.
      </p>
      <div
        className={styles.tableWrap}
        // Scrolls sideways on small screens, so it must be reachable by keyboard.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label="Fontes"
      >
        <table className={styles.table} data-testid="saude">
          <thead>
            <tr>
              <th scope="col">Fonte</th>
              <th scope="col">Situação</th>
              <th scope="col">Última execução</th>
              <th scope="col">Último sucesso</th>
              <th scope="col">Fila</th>
              <th scope="col">Respostas em 7 dias</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source} data-testid={`saude-${s.source}`}>
                <th scope="row">{SOURCE_NAME[s.source as Source]}</th>
                <td className={styles[`health_${s.status}`]}>
                  <span aria-hidden="true">{MARK[s.status]} </span>
                  {HEALTH_LABEL[s.status]}
                </td>
                <td>
                  {s.lastRun
                    ? `${when(s.lastRun.startedAt)}, ${RUN_LABEL[s.lastRun.status]} (${s.lastRun.done} feitas, ${s.lastRun.failed} com falha)`
                    : "—"}
                </td>
                <td>{when(s.lastSuccessAt)}</td>
                <td>
                  {s.queue.queued} na fila, {s.queue.running} rodando,{" "}
                  {s.queue.failed} com falha
                </td>
                <td>{formatInteger(s.responses7d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={styles.h2}>Falhas nos últimos 7 dias</h2>
      {failures.length ? (
        <ul className={styles.list} data-testid="falhas">
          {failures.map((f, i) => (
            <li key={i}>
              <strong>{SOURCE_NAME[f.source as Source] ?? f.source}</strong> ·{" "}
              {f.kind} · {f.attempts} tentativas · {when(f.at)}
              <p className={styles.secret}>{f.error || "—"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhuma falha.</p>
      )}
    </>
  );
}
