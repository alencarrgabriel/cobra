import { connection } from "next/server";
import { Suspense } from "react";

import { DataUnavailable } from "@/app/obras/DataUnavailable";
import { getRecentBallots } from "@/lib/politicians/queries";

import styles from "../perfil.module.css";
import { HowVoted } from "../sections";
import { profileOf, safe, tabMetadata } from "../tab";

export function generateMetadata({
  params,
}: PageProps<"/politicos/[slug]/votos">) {
  return tabMetadata(params, "votos");
}

export default function VotesPage({
  params,
}: PageProps<"/politicos/[slug]/votos">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <Votes params={params} />
    </Suspense>
  );
}

async function Votes({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const ctx = await profileOf(params);
  if (!ctx) return <DataUnavailable />;
  const { p, current } = ctx;
  void p;
  void current;
  const ballots = await safe(() => getRecentBallots(p.id));
  if (!ballots) return <DataUnavailable />;
  return <HowVoted ballots={ballots} house={current?.house} />;
}
