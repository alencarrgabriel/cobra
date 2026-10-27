import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { authClient } from "@/lib/editorial/supabase";

import { verifyCode } from "../actions";
import styles from "../painel.module.css";

export const metadata: Metadata = { title: "Código do app autenticador" };

export default function CodePage({
  searchParams,
}: PageProps<"/painel/codigo">) {
  return (
    <>
      <h1 className={styles.title}>Segundo fator</h1>
      <Suspense fallback={<p className={styles.note}>Carregando…</p>}>
        <Step searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Step({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await authClient();
  if (!supabase) redirect("/painel/indisponivel");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/painel/entrar");
  const { erro } = await searchParams;
  const factors = (await supabase.auth.mfa.listFactors()).data?.all ?? [];
  const verified = factors.find(
    (f) => f.factor_type === "totp" && f.status === "verified",
  );
  const error =
    erro === "codigo" ? (
      <p role="alert" className={styles.alert} data-testid="erro-painel">
        Código incorreto ou vencido. Confira o app e tente de novo.
      </p>
    ) : null;

  if (verified) {
    return (
      <>
        <p>Digite o código de 6 dígitos que o app autenticador mostra agora.</p>
        {error}
        <CodeForm factorId={verified.id} />
      </>
    );
  }

  // First sign-in: enroll the authenticator app. Leftover unverified factors are removed
  // first, so a reload does not pile them up.
  for (const f of factors.filter((f) => f.status !== "verified")) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll(
    {
      factorType: "totp",
      friendlyName: "Cobra",
    },
  );
  if (enrollError || !enrolled) {
    return (
      <p role="alert" className={styles.alert}>
        Não foi possível iniciar o cadastro do app autenticador.
      </p>
    );
  }
  return (
    <>
      <p>
        Primeiro acesso: cadastre o Cobra no seu app autenticador (Google
        Authenticator, 1Password, Authy…) lendo o QR code, ou digitando a chave.
        Depois digite o código de 6 dígitos.
      </p>
      {error}
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG data URI from Supabase */}
      <img
        src={enrolled.totp.qr_code}
        alt="QR code para cadastrar o app autenticador"
        className={styles.qr}
        width={200}
        height={200}
      />
      <p>
        Chave:{" "}
        <span className={styles.secret} data-testid="totp-secret">
          {enrolled.totp.secret}
        </span>
      </p>
      <CodeForm factorId={enrolled.id} />
    </>
  );
}

function CodeForm({ factorId }: { factorId: string }) {
  return (
    <form action={verifyCode} className={styles.form}>
      <input type="hidden" name="factor" value={factorId} />
      <label>
        Código
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </label>
      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          Confirmar
        </Button>
      </div>
    </form>
  );
}
