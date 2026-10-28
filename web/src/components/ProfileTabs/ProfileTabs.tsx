"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import styles from "./ProfileTabs.module.css";

export type ProfileTab = { key: string; label: string };

/**
 * Links to the profile's tabs. Every tab is a page with its own address, so this works
 * without JavaScript; the script only marks the current one and keeps it in view on phones.
 */
export function ProfileTabs({
  base,
  tabs,
}: {
  base: string;
  tabs: readonly ProfileTab[];
}) {
  const pathname = decodeURIComponent(usePathname());
  const current = pathname.startsWith(`${base}/`)
    ? pathname.slice(base.length + 1).split("/")[0]
    : "";
  const active = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current]);
  return (
    <nav aria-label="Seções do perfil" className={styles.nav}>
      <ul className={styles.list}>
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.key ? `${base}/${t.key}` : base}
              className={styles.tab}
              aria-current={t.key === current ? "page" : undefined}
              ref={t.key === current ? active : undefined}
              prefetch={false}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
