import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { alertsAvailable } from "@/lib/alerts/db";

import { askManageLink } from "../actions";
import styles from "../alertas.module.css";

export const metadata: Metadata = {
  title: "Meus dados",
  description:
    "Veja, baixe, corrija ou apague os dados que o Cobra guarda para os seus alertas.",
};

export default function MyDataRequestPage({
  searchParams,
}: PageProps<"/alertas/meus-dados">) {
  return (
    <>
      <h1 className={styles.title}>Meus dados</h1>
      <p>
        Informe o e-mail cadastrado. Enviamos um link, válido por 1 hora, para
        você ver, baixar, corrigir ou apagar seus dados.
      </p>
      <Suspense fallback={null}>
        <Request searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Request({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (!alertsAvailable()) {
    return (
      <p className={styles.alert}>
        Este serviço está fora do ar no momento. Tente de novo mais tarde.
      </p>
    );
  }
  const { erro } = await searchParams;
  return (
    <form action={askManageLink} className={styles.form}>
      {erro === "email" ? (
        <p role="alert" className={styles.alert}>
          Confira o endereço de e-mail.
        </p>
      ) : null}
      <label>
        E-mail
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <div className={styles.trap} aria-hidden="true">
        <label>
          Não preencha
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          Enviar o link
        </Button>
      </div>
    </form>
  );
}
