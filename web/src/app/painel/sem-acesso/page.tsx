import type { Metadata } from "next";

import { Button } from "@/components/Button/Button";

import { signOut } from "../actions";
import styles from "../painel.module.css";

export const metadata: Metadata = { title: "Sem acesso" };

export default function NoAccessPage() {
  return (
    <>
      <h1 className={styles.title}>Sem acesso ao painel</h1>
      <p role="alert" className={styles.alert} data-testid="sem-acesso">
        Esta conta não está na lista de editores ativos do Cobra.
      </p>
      <form action={signOut}>
        <Button type="submit">Sair</Button>
      </form>
    </>
  );
}
