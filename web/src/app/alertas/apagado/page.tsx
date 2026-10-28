import type { Metadata } from "next";
import Link from "next/link";

import styles from "../alertas.module.css";

export const metadata: Metadata = {
  title: "Dados apagados",
  robots: { index: false },
};

export default function ErasedPage() {
  return (
    <>
      <h1 className={styles.title}>Dados apagados</h1>
      <p className={styles.ok} data-testid="apagado">
        Apagamos seu e-mail, seu estado e os políticos que você seguia. Fica só
        o registro de que houve uma exclusão, sem nenhum dado seu.
      </p>
      <p>
        <Link href="/">Voltar para a página inicial</Link>
      </p>
    </>
  );
}
