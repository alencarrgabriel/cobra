"use client";

import { useEffect } from "react";

import styles from "./Toast.module.css";

type Props = { message: string | null; onDone: () => void; duration?: number };

/** Short confirmation ("Link copiado"), announced politely to screen readers. */
export function Toast({ message, onDone, duration = 2200 }: Props) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDone, duration);
    return () => clearTimeout(id);
  }, [message, onDone, duration]);

  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {message ? <p className={styles.toast}>{message}</p> : null}
    </div>
  );
}
