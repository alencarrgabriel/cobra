import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import styles from "@/app/alertas/alertas.module.css";
import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { publicQueue } from "@/lib/reports/queries";
import { RESPONSE_BUSINESS_DAYS, todayInBrasilia } from "@/lib/reports/rules";

import { ReportItem } from "./ReportItem";

export const metadata: Metadata = {
  title: "Correções",
  description:
    "Fila pública de reportes de erro e contestações do Cobra, com a situação e a nota da equipe.",
};

export default function CorrectionsPage({
  searchParams,
}: PageProps<"/correcoes">) {
  return (
    <main className={`${styles.page} gutter`}>
      <h1 className={styles.title}>Correções</h1>
      <p className={styles.lead}>
        Todo reporte de erro e toda contestação ficam aqui, com a situação e o
        que a equipe fez. Respondemos em até {RESPONSE_BUSINESS_DAYS} dias
        úteis. O texto enviado e o contato de quem reportou não são publicados.
      </p>
      <p>
        <Link href="/reportar">Reportar um erro</Link>
      </p>
      <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
        <Queue searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Queue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { pagina } = await searchParams;
  const page = Math.max(1, Math.min(1000, Number(pagina) || 1));
  let data;
  try {
    data = await publicQueue(page);
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  const today = todayInBrasilia();
  return (
    <>
      <p data-testid="totais">
        {data.open} em aberto · {data.closed} respondidos
      </p>
      <ol className={styles.list} data-testid="fila-publica">
        {data.items.map((r) => (
          <li key={r.id}>
            <ReportItem r={r} today={today} />
          </li>
        ))}
      </ol>
      {data.items.length === 0 ? <p>Nenhum reporte ainda.</p> : null}
      <nav aria-label="Páginas" className={styles.actions}>
        {page > 1 ? (
          <Link href={`/correcoes?pagina=${page - 1}`}>← Mais recentes</Link>
        ) : null}
        {data.more ? (
          <Link href={`/correcoes?pagina=${page + 1}`}>Mais antigos →</Link>
        ) : null}
      </nav>
    </>
  );
}
