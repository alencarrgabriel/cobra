"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { readRememberedPlace } from "@/components/RememberedPlace/RememberedPlace";

import styles from "./votacoes.module.css";

/** Offers the remembered place (IBGE code only, never the CEP) to see its representatives'
 *  votes in the feed (change feed-e-pagina-votacao, design D2). */
export function PlaceLink() {
  const [saved, setSaved] = useState<{ codigo: string; nome: string } | null>(
    null,
  );
  // Read after mounting: the server has no access to this device's storage.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSaved(readRememberedPlace()), []);
  if (saved) {
    return (
      <p data-testid="lugar-sugerido">
        <Link href={`/votacoes?lugar=${saved.codigo}`}>
          Ver como votaram os representantes de {saved.nome}
        </Link>
      </p>
    );
  }
  return (
    <p className={styles.note}>
      Para ver como votaram os seus representantes, escolha o seu lugar em{" "}
      <Link href="/representantes">Seus representantes</Link>.
    </p>
  );
}
