import { connection } from "next/server";
import { Suspense } from "react";

import { DataUnavailable } from "@/app/obras/DataUnavailable";
import { getAssets, getReceipts } from "@/lib/politicians/queries";

import styles from "../perfil.module.css";
import { Assets, Receipts } from "../sections";
import { profileOf, safe, tabMetadata } from "../tab";

export function generateMetadata({
  params,
}: PageProps<"/politicos/[slug]/patrimonio">) {
  return tabMetadata(params, "patrimonio");
}

export default function AssetsTabPage({
  params,
}: PageProps<"/politicos/[slug]/patrimonio">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <AssetsTab params={params} />
    </Suspense>
  );
}

async function AssetsTab({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const ctx = await profileOf(params);
  if (!ctx) return <DataUnavailable />;
  const { p, current } = ctx;
  void p;
  void current;
  const data = await safe(() =>
    Promise.all([getAssets(p.id), getReceipts(p.id)]),
  );
  if (!data) return <DataUnavailable />;
  const [assets, receipts] = data;
  return (
    <>
      <Assets data={assets} />
      <Receipts data={receipts} />
    </>
  );
}
