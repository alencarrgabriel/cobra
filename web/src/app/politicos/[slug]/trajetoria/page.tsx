import { connection } from "next/server";
import { Suspense } from "react";

import { DataUnavailable } from "@/app/obras/DataUnavailable";
import { getCandidacies } from "@/lib/politicians/queries";

import styles from "../perfil.module.css";
import { Mandates } from "../Cards";
import { Trajectory } from "../sections";
import { profileOf, safe, tabMetadata } from "../tab";

export function generateMetadata({
  params,
}: PageProps<"/politicos/[slug]/trajetoria">) {
  return tabMetadata(params, "trajetoria");
}

export default function TrajectoryTabPage({
  params,
}: PageProps<"/politicos/[slug]/trajetoria">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <TrajectoryTab params={params} />
    </Suspense>
  );
}

async function TrajectoryTab({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const ctx = await profileOf(params);
  if (!ctx) return <DataUnavailable />;
  const { p, current } = ctx;
  void p;
  void current;
  const candidacies = await safe(() => getCandidacies(p.id));
  if (!candidacies) return <DataUnavailable />;
  return (
    <>
      <Mandates p={p} current={current} />
      <Trajectory candidacies={candidacies} />
    </>
  );
}
