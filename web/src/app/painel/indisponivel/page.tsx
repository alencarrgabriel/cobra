import type { Metadata } from "next";

import styles from "../painel.module.css";

export const metadata: Metadata = { title: "Indisponível" };

export default function UnavailablePage() {
  return (
    <>
      <h1 className={styles.title}>Painel indisponível</h1>
      <p>O painel editorial não está configurado neste servidor.</p>
    </>
  );
}
