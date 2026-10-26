import Link from "next/link";
import { type ReactNode, useId } from "react";

import styles from "./obras.module.css";

// Filters are plain links: they work without JavaScript and the address can be shared (design D3).

export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={styles.group}>
      <p className={styles.groupLabel} id={id}>
        {label}
      </p>
      <ul className={styles.chips} aria-labelledby={id}>
        {children}
      </ul>
    </div>
  );
}

export function FilterLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={styles.chip}
        aria-current={current ? "true" : undefined}
        scroll={false}
      >
        {children}
      </Link>
    </li>
  );
}
