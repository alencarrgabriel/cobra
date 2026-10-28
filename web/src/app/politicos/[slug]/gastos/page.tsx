import { connection } from "next/server";
import { Suspense } from "react";

import { DataUnavailable } from "@/app/obras/DataUnavailable";
import { getExpenses } from "@/lib/politicians/queries";

import styles from "../perfil.module.css";
import { Expenses } from "../sections";
import { profileOf, safe, tabMetadata } from "../tab";

export function generateMetadata({
  params,
}: PageProps<"/politicos/[slug]/gastos">) {
  return tabMetadata(params, "gastos");
}

export default function SpendingPage({
  params,
}: PageProps<"/politicos/[slug]/gastos">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <Spending params={params} />
    </Suspense>
  );
}

async function Spending({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const ctx = await profileOf(params);
  if (!ctx) return <DataUnavailable />;
  const { p, current } = ctx;
  void p;
  void current;
  const data = await safe(() => getExpenses(p.id));
  if (!data) return <DataUnavailable />;
  return (
    <Expenses
      data={data}
      house={current?.house}
      externalId={current ? p.externalIds[current.house] : undefined}
    />
  );
}
