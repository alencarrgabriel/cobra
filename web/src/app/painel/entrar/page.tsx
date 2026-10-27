import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";

import { signIn } from "../actions";
import styles from "../painel.module.css";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage({
  searchParams,
}: PageProps<"/painel/entrar">) {
  return (
    <>
      <h1 className={styles.title}>Painel editorial</h1>
      <p className={styles.note}>
        Acesso só para editores do Cobra, com senha e código do app
        autenticador.
      </p>
      <Suspense fallback={null}>
        <Error searchParams={searchParams} />
      </Suspense>
      <form action={signIn} className={styles.form}>
        <label>
          E-mail
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <div className={styles.actions}>
          <Button type="submit" variant="primary">
            Entrar
          </Button>
        </div>
      </form>
    </>
  );
}

async function Error({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { erro } = await searchParams;
  if (erro !== "credenciais") return null;
  return (
    <p role="alert" className={styles.alert} data-testid="erro-painel">
      E-mail ou senha incorretos.
    </p>
  );
}
