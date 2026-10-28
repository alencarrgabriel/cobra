import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { isUnsubscribeToken } from "@/lib/alerts/service";

import { leave } from "../../actions";
import styles from "../../alertas.module.css";
import { Expired } from "../../Expired";

export const metadata: Metadata = {
  title: "Sair dos alertas",
  robots: { index: false },
};

// The permanent exit link of every message (RF-52). The provider's one-click POST goes to
// ./um-clique; here a button, so that opening the link alone changes nothing.
export default function LeavePage({
  params,
  searchParams,
}: PageProps<"/alertas/sair/[token]">) {
  return (
    <>
      <h1 className={styles.title}>Sair dos alertas</h1>
      <Suspense fallback={null}>
        <Leave params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Leave({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  if (!isUnsubscribeToken(token)) return <Expired />;
  if ((await searchParams).feito === "1") {
    return (
      <>
        <p className={styles.ok} data-testid="saiu">
          Pronto, você não vai mais receber o resumo semanal.
        </p>
        <p>
          Para apagar também seus dados,{" "}
          <Link href="/alertas/meus-dados">peça o link de meus dados</Link>.
        </p>
      </>
    );
  }
  return (
    <form action={leave}>
      <input type="hidden" name="token" value={token} />
      <Button type="submit" variant="primary">
        Não quero mais receber o resumo
      </Button>
    </form>
  );
}
