import type { Metadata } from "next";
import Link from "next/link";

import styles from "../alertas.module.css";

export const metadata: Metadata = {
  title: "Verifique seu e-mail",
  robots: { index: false },
};

// The same answer whether or not the address exists or is over a limit (design D3).
export default function SentPage() {
  return (
    <>
      <h1 className={styles.title}>Verifique seu e-mail</h1>
      <p className={styles.ok} data-testid="enviado">
        Se o endereço puder receber, enviamos um link. Ele vale por pouco tempo:
        abra-o no mesmo dia.
      </p>
      <p className={styles.note}>
        Não chegou? Confira a caixa de spam. Para não sobrecarregar ninguém,
        enviamos no máximo três links por hora para o mesmo endereço.
      </p>
      <p>
        <Link href="/">Voltar para a página inicial</Link>
      </p>
    </>
  );
}
