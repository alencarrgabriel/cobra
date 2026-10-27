import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { Card } from "@/components/Card/Card";
import { officeTitle, ticket } from "@/lib/plans/labels";
import { listPlans, type PlanSummary } from "@/lib/plans/queries";
import { formatDate, formatInteger } from "@/lib/works/format";

import styles from "./planos.module.css";

export const metadata: Metadata = {
  title: "Planos de governo",
  description:
    "O plano de governo registrado no TSE por quem governa, por tema, com o trecho literal e a página do PDF oficial.",
};

export default function PlansPage() {
  return (
    <main className={`${styles.page} gutter`}>
      <header className={styles.header}>
        <p className="eyebrow">Planos de governo</p>
        <h1 className={`display ${styles.title}`}>
          O que quem governa registrou no TSE
        </h1>
        <p className={styles.lead}>
          O plano de governo que cada chapa eleita entregou à Justiça Eleitoral,
          organizado por tema, com o texto como está no documento e a página do
          PDF oficial. Sem resumo e sem IA.
        </p>
      </header>
      <Suspense fallback={<p className={styles.note}>Carregando planos…</p>}>
        <Plans />
      </Suspense>
    </main>
  );
}

async function Plans() {
  // Read per request (the query itself is cached), so a build never freezes the list.
  await connection();
  let plans: PlanSummary[];
  try {
    plans = await listPlans();
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  if (plans.length === 0)
    return <p>O Cobra ainda não tem planos de governo.</p>;
  return (
    <ul className={styles.plans}>
      {plans.map((plan) => (
        <li key={plan.slug}>
          <Card aria-labelledby={`plano-${plan.slug}`}>
            <p className="eyebrow">Eleição de {plan.year}</p>
            <h2 id={`plano-${plan.slug}`} className={styles.h2}>
              <Link href={`/planos/${plan.slug}`}>{officeTitle(plan)}</Link>
            </h2>
            <p>Chapa eleita: {ticket(plan)}.</p>
            <p className={styles.source}>
              {formatInteger(plan.pages)} páginas. Fonte: TSE, coletado pelo
              Cobra em {formatDate(plan.collectedAt)}.
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}
