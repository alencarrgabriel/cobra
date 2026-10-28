import Link from "next/link";

import styles from "./alertas.module.css";

/** A link already used or past its deadline. */
export function Expired({ again = "/alertas" }: { again?: string }) {
  return (
    <>
      <p role="alert" className={styles.alert} data-testid="link-invalido">
        Este link não vale mais: já foi usado ou passou do prazo.
      </p>
      <p>
        <Link href={again}>Pedir um novo link</Link>
      </p>
    </>
  );
}
