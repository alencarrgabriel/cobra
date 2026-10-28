import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { EMAIL_CONSENT, FOLLOWS_CONSENT } from "@/lib/alerts/consent";
import { alertsAvailable } from "@/lib/alerts/db";
import { UF_OPTIONS } from "@/lib/alerts/service";
import { getPolitician } from "@/lib/politicians/queries";

import { signUp } from "./actions";
import styles from "./alertas.module.css";
import { UfDefault } from "./UfDefault";

export const metadata: Metadata = {
  title: { absolute: "Alertas por e-mail | Cobra" },
  description:
    "Receba por e-mail, uma vez por semana, o que fizeram os representantes do seu estado e os políticos que você segue.",
};

const ERRORS: Record<string, string> = {
  email: "Confira o endereço de e-mail.",
  consentimento: "Para receber o resumo, marque a autorização do e-mail.",
  consentimento_seguidos:
    "Para seguir, marque também a autorização para guardar os políticos que você segue.",
};

type Search = Record<string, string | string[] | undefined>;

export default function AlertsPage({ searchParams }: PageProps<"/alertas">) {
  return (
    <>
      <h1 className={styles.title}>Alertas por e-mail</h1>
      <p className={styles.lead}>
        Uma vez por semana, o que fizeram os representantes do seu estado e os
        políticos que você segue: como votaram, presença e gastos, sempre com a
        fonte oficial.
      </p>
      <Suspense fallback={null}>
        <SignUp searchParams={searchParams} />
      </Suspense>
      <p className={styles.note}>
        Só pedimos o e-mail e, se quiser, o estado. Os dados ficam cifrados e
        você pode ver, baixar ou apagar tudo quando quiser.{" "}
        <Link href="/privacidade">Como tratamos seus dados</Link> ·{" "}
        <Link href="/alertas/meus-dados">Já me cadastrei: meus dados</Link>
      </p>
    </>
  );
}

async function SignUp({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  if (!alertsAvailable()) {
    return (
      <p className={styles.alert} data-testid="alertas-indisponivel">
        O cadastro de alertas está fora do ar no momento. Tente de novo mais
        tarde.
      </p>
    );
  }
  const query = await searchParams;
  const seguir = typeof query.seguir === "string" ? query.seguir : "";
  const follow = /^\d{1,12}$/.test(seguir)
    ? await getPolitician(Number(seguir))
    : null;
  const erro = typeof query.erro === "string" ? ERRORS[query.erro] : undefined;
  return (
    <form action={signUp} className={styles.form} data-testid="cadastro">
      {erro ? (
        <p role="alert" className={styles.alert} data-testid="erro-cadastro">
          {erro}
        </p>
      ) : null}
      {follow ? (
        <p data-testid="seguir-quem">
          Você vai seguir <strong>{follow.name}</strong>.
        </p>
      ) : null}
      <label>
        E-mail
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Estado (opcional)
        <select name="uf" id="alertas-uf" defaultValue="">
          <option value="">Prefiro não informar</option>
          {UF_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <UfDefault selectId="alertas-uf" />
      <label className={styles.check}>
        <input type="checkbox" name="consentimento_email" value="sim" />
        <span>{EMAIL_CONSENT}</span>
      </label>
      {follow ? (
        <div className={styles.sensitive}>
          <input type="hidden" name="seguir" value={follow.id} />
          <strong>Autorização separada: políticos seguidos</strong>
          <label className={styles.check}>
            <input type="checkbox" name="consentimento_seguidos" value="sim" />
            <span>{FOLLOWS_CONSENT}</span>
          </label>
        </div>
      ) : null}
      <div className={styles.trap} aria-hidden="true">
        <label>
          Não preencha
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          {follow ? "Seguir e receber o resumo" : "Receber o resumo"}
        </Button>
      </div>
      <p className={styles.note}>
        Vamos mandar um link para confirmar. Nada vale até você abrir o link.
      </p>
    </form>
  );
}
