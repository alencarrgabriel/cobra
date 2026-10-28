import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import styles from "@/app/alertas/alertas.module.css";
import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { publicReport } from "@/lib/reports/queries";
import { todayInBrasilia } from "@/lib/reports/rules";

import { ReportItem } from "../ReportItem";

export async function generateMetadata({
  params,
}: PageProps<"/correcoes/[protocolo]">): Promise<Metadata> {
  return { title: `Correção nº ${(await params).protocolo}` };
}

// Unknown protocols get a real 404 from the Proxy.
export default function ReportPage({
  params,
}: PageProps<"/correcoes/[protocolo]">) {
  return (
    <main className={`${styles.page} gutter`}>
      <p>
        <Link href="/correcoes">← Correções</Link>
      </p>
      <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
        <Report params={params} />
      </Suspense>
    </main>
  );
}

async function Report({ params }: { params: Promise<{ protocolo: string }> }) {
  await connection();
  const { protocolo } = await params;
  let report;
  try {
    report = /^\d{1,12}$/.test(protocolo)
      ? await publicReport(Number(protocolo))
      : null;
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  if (!report) return <DataUnavailable />;
  return <ReportItem r={report} today={todayInBrasilia()} />;
}
