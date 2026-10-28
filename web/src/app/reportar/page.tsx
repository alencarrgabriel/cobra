import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import styles from "@/app/alertas/alertas.module.css";
import { Button } from "@/components/Button/Button";
import { serverEnv } from "@/config/env";
import { reportsAvailable } from "@/lib/reports/db";
import {
  MAX_TEXT,
  MIN_TEXT,
  pagePath,
  PURGE_DAYS,
  RESPONSE_BUSINESS_DAYS,
} from "@/lib/reports/rules";

import { sendReport } from "./actions";

export const metadata: Metadata = {
  title: "Reportar erro",
  description:
    "Achou um dado errado no Cobra ou é a pessoa retratada numa página? Conte para a equipe; respondemos em até 5 dias úteis.",
};

const ERRORS: Record<string, string> = {
  curto: `Conte um pouco mais: pelo menos ${MIN_TEXT} caracteres.`,
  longo: `O texto passou de ${MAX_TEXT} caracteres.`,
  email: "Confira o endereço de e-mail, ou deixe o campo em branco.",
  limite: "Recebemos muitos reportes hoje. Tente de novo amanhã, por favor.",
};

type Search = Record<string, string | string[] | undefined>;

export default function ReportPage({ searchParams }: PageProps<"/reportar">) {
  return (
    <main className={`${styles.page} gutter`}>
      <h1 className={styles.title}>Reportar erro</h1>
      <Suspense fallback={null}>
        <ReportForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ReportForm({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const query = await searchParams;
  const one = (k: string) => (typeof query[k] === "string" ? query[k] : "");
  const page = pagePath(one("pagina")) ?? "/";
  const contest = one("tipo") === "contestacao";
  const erro = ERRORS[one("erro")];
  if (!reportsAvailable()) {
    return (
      <p className={styles.alert} data-testid="reporte-indisponivel">
        O formulário está fora do ar no momento. Tente de novo mais tarde.
      </p>
    );
  }
  return (
    <>
      <p className={styles.lead}>
        {contest
          ? "Se você é a pessoa retratada nesta página, tem direito de resposta e de correção. Diga o que está errado e, se puder, qual é a fonte."
          : "Diga o que está errado e, se puder, onde está o dado certo (link ou documento oficial)."}
      </p>
      <p>
        Respondemos em até {RESPONSE_BUSINESS_DAYS} dias úteis. Todo reporte
        entra na <Link href="/correcoes">fila pública de correções</Link>, sem o
        que você escreveu e sem o seu contato.
      </p>
      <form action={sendReport} className={styles.form} data-testid="reporte">
        {erro ? (
          <p role="alert" className={styles.alert} data-testid="erro-reporte">
            {erro}
          </p>
        ) : null}
        <input type="hidden" name="pagina" value={page} />
        <p>
          Página:{" "}
          {page === "/" ? (
            "o Cobra em geral"
          ) : (
            <Link href={page} data-testid="pagina-reportada">
              {page}
            </Link>
          )}
        </p>
        <fieldset>
          <legend>Tipo</legend>
          <label className={styles.check}>
            <input
              type="radio"
              name="tipo"
              value="erro"
              defaultChecked={!contest}
            />
            <span>Erro num dado</span>
          </label>
          <label className={styles.check}>
            <input
              type="radio"
              name="tipo"
              value="contestacao"
              defaultChecked={contest}
            />
            <span>Sou a pessoa desta página e quero contestar</span>
          </label>
        </fieldset>
        <label>
          O que está errado
          <textarea
            name="descricao"
            required
            minLength={MIN_TEXT}
            maxLength={MAX_TEXT}
          />
        </label>
        {serverEnv().ALERTS_SECRET ? (
          <label>
            E-mail para resposta (opcional)
            <input type="email" name="email" autoComplete="email" />
            <span className={styles.note}>
              Usado só para responder este reporte e apagado {PURGE_DAYS} dias
              depois do fechamento. Sem e-mail, acompanhe pelo número de
              protocolo.
            </span>
          </label>
        ) : null}
        <div className={styles.trap} aria-hidden="true">
          <label>
            Não preencha
            <input type="text" name="site" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div className={styles.actions}>
          <Button type="submit" variant="primary">
            Enviar reporte
          </Button>
        </div>
      </form>
    </>
  );
}
