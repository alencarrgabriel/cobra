"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import styles from "./AppShell.module.css";
import { type Section, SECTIONS } from "./sections";

const ICONS: Record<Section["icon"], ReactNode> = {
  home: (
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M3 19c.8-3.3 3.2-5 6-5s5.2 1.7 6 5M15 14.4c2.6-.4 4.7.9 5.6 3.6" />
    </>
  ),
  votes: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  works: <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />,
  plans: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7" />,
};

// A section stays marked on its inner pages, e.g. /obras/<code>.
const isCurrent = (pathname: string, href: string) =>
  pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

type Variant = "top" | "bottom";

/** The current page is marked once the path is known (inside <Suspense>, see AppShell). */
export function Nav({ variant }: { variant: Variant }) {
  return <NavList variant={variant} pathname={usePathname()} />;
}

/** Sections; without a path (prerendered shell) nothing is marked as current. */
export function NavList({
  variant,
  pathname,
}: {
  variant: Variant;
  pathname: string | null;
}) {
  return (
    <nav
      aria-label={variant === "top" ? "Seções" : "Seções (barra inferior)"}
      className={variant === "top" ? styles.topNav : styles.tabbar}
    >
      <ul className={variant === "top" ? styles.topList : styles.tabList}>
        {SECTIONS.map((s) => {
          const icon =
            variant === "bottom" ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                {ICONS[s.icon]}
              </svg>
            ) : null;
          return (
            <li key={s.href}>
              {s.available ? (
                <Link
                  href={s.href}
                  className={styles.item}
                  aria-current={
                    pathname && isCurrent(pathname, s.href) ? "page" : undefined
                  }
                >
                  {icon}
                  {s.label}
                </Link>
              ) : (
                <span
                  className={`${styles.item} ${styles.soon}`}
                  aria-disabled="true"
                >
                  {icon}
                  {s.label}
                  <small>em breve</small>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
