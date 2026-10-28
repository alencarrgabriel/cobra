import { connection } from "next/server";
import { Suspense } from "react";

import { DataUnavailable } from "@/app/obras/DataUnavailable";
import { getAmendments, getLinkedWorks } from "@/lib/politicians/queries";

import styles from "../perfil.module.css";
import { AmendmentsCard, WorksCard } from "../Cards";
import { profileOf, safe, tabMetadata } from "../tab";

export function generateMetadata({
  params,
}: PageProps<"/politicos/[slug]/emendas">) {
  return tabMetadata(params, "emendas");
}

export default function AmendmentsPage({
  params,
}: PageProps<"/politicos/[slug]/emendas">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <Amendments params={params} />
    </Suspense>
  );
}

async function Amendments({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const ctx = await profileOf(params);
  if (!ctx) return <DataUnavailable />;
  const { p, current } = ctx;
  void p;
  void current;
  const data = await safe(() =>
    Promise.all([getAmendments(p.id), getLinkedWorks(p.id)]),
  );
  if (!data) return <DataUnavailable />;
  const [amendments, works] = data;
  return (
    <>
      <AmendmentsCard amendments={amendments} current={current} />
      <WorksCard works={works} />
    </>
  );
}
