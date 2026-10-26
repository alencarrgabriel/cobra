import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./AppShell.module.css";
import { Nav } from "./Nav";

/** Top bar with sections (wide screens) and a fixed bottom tab bar (phones). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className={`${styles.top} gutter`}>
        <div className={styles.topInner}>
          <Link
            href="/"
            className={styles.brand}
            aria-label="Cobra, página inicial"
          >
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="var(--accent)" />
              <path
                d="M21.5 11.5a6.5 6.5 0 1 0 0 9"
                fill="none"
                stroke="var(--accent-fg)"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
              <circle cx="22.4" cy="11.4" r="1.6" fill="var(--vote-yes)" />
            </svg>
            Cobra
          </Link>
          <Nav variant="top" />
          <div className={styles.actions}>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className={styles.content}>{children}</div>
      <Nav variant="bottom" />
    </>
  );
}
