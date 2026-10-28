import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/Button/Button";
import { describeConfirmation } from "@/lib/alerts/service";

import { confirmSignup } from "../../actions";
import styles from "../../alertas.module.css";
import { Expired } from "../../Expired";

export const metadata: Metadata = {
  title: "Confirmar cadastro",
  robots: { index: false },
};

// Opening the link changes nothing: mail scanners open links on their own (design D3).
export default function ConfirmPage({
  params,
}: PageProps<"/alertas/confirmar/[token]">) {
  return (
    <>
      <h1 className={styles.title}>Confirmar cadastro</h1>
      <Suspense fallback={<p className={styles.note}>Conferindo o link…</p>}>
        <Confirm params={params} />
      </Suspense>
    </>
  );
}

async function Confirm({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pending = await describeConfirmation(token);
  if (!pending) return <Expired />;
  return (
    <form action={confirmSignup} className={styles.form}>
      <input type="hidden" name="token" value={token} />
      <ul className={styles.prose}>
        <li>Receber o resumo semanal do Cobra por e-mail.</li>
        {pending.ufName ? <li>Estado: {pending.ufName}.</li> : null}
        {pending.follow ? (
          <li data-testid="confirmar-seguir">
            Seguir {pending.follow.name}, com a sua autorização para guardar os
            políticos que você segue.
          </li>
        ) : null}
      </ul>
      <div className={styles.actions}>
        <Button type="submit" variant="primary">
          Confirmar
        </Button>
      </div>
    </form>
  );
}
