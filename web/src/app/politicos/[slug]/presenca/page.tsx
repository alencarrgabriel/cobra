import { connection } from "next/server";
import { Suspense } from "react";

import { DataUnavailable } from "@/app/obras/DataUnavailable";
import { getAttendance } from "@/lib/politicians/queries";

import styles from "../perfil.module.css";
import { Attendance } from "../sections";
import { profileOf, safe, tabMetadata } from "../tab";

export function generateMetadata({
  params,
}: PageProps<"/politicos/[slug]/presenca">) {
  return tabMetadata(params, "presenca");
}

export default function PresencePage({
  params,
}: PageProps<"/politicos/[slug]/presenca">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
      <Presence params={params} />
    </Suspense>
  );
}

async function Presence({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const ctx = await profileOf(params);
  if (!ctx) return <DataUnavailable />;
  const { p, current } = ctx;
  void p;
  void current;
  const house = current?.house;
  const data = await safe(async () =>
    house === "camara" || house === "senado"
      ? getAttendance(p.id, house)
      : null,
  );
  if (data === null && (house === "camara" || house === "senado")) {
    return <DataUnavailable />;
  }
  return <Attendance data={data} />;
}
