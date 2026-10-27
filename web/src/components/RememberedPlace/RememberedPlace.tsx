"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "./RememberedPlace.module.css";

// Last place seen, kept only on this device and without an account (RF-07, change
// busca-geografica design D7): the IBGE code and the name, never the CEP.
const KEY = "cobra:lugar";

type Saved = { codigo: string; nome: string };

function read(): Saved | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(KEY) ?? "null",
    ) as Saved | null;
    return value && /^\d{2}(\d{5})?$/.test(value.codigo) && value.nome
      ? value
      : null;
  } catch {
    return null;
  }
}

/** Saves the place being viewed. Renders nothing. */
export function RememberPlace({ codigo, nome }: Saved) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ codigo, nome }));
    } catch {
      // Private browsing without storage: nothing to remember.
    }
  }, [codigo, nome]);
  return null;
}

/** Shortcut back to the remembered place, with a way to forget it. */
export function RememberedPlace() {
  const [saved, setSaved] = useState<Saved | null>(null);
  // Read after mounting: the server has no access to this device's storage.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSaved(read()), []);
  if (!saved) return null;
  return (
    <p className={styles.remembered} data-testid="lugar-lembrado">
      <Link href={`/representantes/${saved.codigo}`}>
        Ver seus representantes em {saved.nome}
      </Link>
      <button
        type="button"
        className={styles.forget}
        onClick={() => {
          try {
            localStorage.removeItem(KEY);
          } catch {
            // Nothing stored.
          }
          setSaved(null);
        }}
      >
        Esquecer este lugar
      </button>
    </p>
  );
}
