import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import styles from "@/app/alertas/alertas.module.css";
import { isDataUnavailable } from "@/app/obras/DataUnavailable";
import { publicReport } from "@/lib/reports/queries";
import { formatDate } from "@/lib/works/format";

export const metadata: Metadata = {
  title: "Reporte enviado",
  robots: { index: false },
};

export default function SentPage({
  searchParams,
}: PageProps<"/reportar/enviado">) {
  return (
    <main className={`${styles.page} gutter`}>
      <h1 className={styles.title}>Reporte enviado</h1>
      <Suspense fallback={null}>
        <Sent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Sent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { protocolo } = await searchParams;
  const id =
    typeof protocolo === "string" && /^\d{1,12}$/.test(protocolo)
      ? Number(protocolo)
      : null;
  let report = null;
  try {
    report = id ? await publicReport(id) : null;
  } catch (error) {
    if (!isDataUnavailable(error)) throw error;
  }
  if (!report) {
    return <p className={styles.ok}>Obrigado. A equipe vai analisar.</p>;
  }
  return (
    <>
      <p className={styles.ok} data-testid="protocolo">
        Protocolo nº {report.id}. Respondemos até {formatDate(report.dueOn)}.
      </p>
      <p>
        Acompanhe em{" "}
        <Link href={`/correcoes/${report.id}`}>/correcoes/{report.id}</Link>.
        Anote o número: sem e-mail, é por ele que você acompanha.
      </p>
    </>
  );
}
