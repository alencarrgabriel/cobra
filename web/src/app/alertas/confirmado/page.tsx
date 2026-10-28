import type { Metadata } from "next";
import Link from "next/link";

import styles from "../alertas.module.css";

export const metadata: Metadata = {
  title: "Cadastro confirmado",
  robots: { index: false },
};

export default function ConfirmedPage() {
  return (
    <>
      <h1 className={styles.title}>Cadastro confirmado</h1>
      <p className={styles.ok} data-testid="confirmado">
        Pronto. Você vai receber o resumo semanal do Cobra. Toda mensagem traz
        um link para sair com um clique.
      </p>
      <p>
        <Link href="/alertas/meus-dados">Ver ou apagar meus dados</Link>
      </p>
    </>
  );
}
