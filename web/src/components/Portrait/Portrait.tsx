import Image from "next/image";
import type { ReactNode } from "react";

import styles from "./Portrait.module.css";

type Props = {
  name: string;
  /** Official photo. Without it a neutral illustration with the initials is shown. */
  photoUrl?: string;
  /** Party color used as the base band, the same treatment for every party. */
  partyColor?: string;
  /** State flag, rendered in the top-left corner. */
  flag?: ReactNode;
  size?: "sm" | "md" | "lg";
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function Portrait({
  name,
  photoUrl,
  partyColor,
  flag,
  size = "md",
}: Props) {
  return (
    <div className={`${styles.portrait} ${styles[size]}`}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          fill
          sizes="(max-width: 820px) 45vw, 200px"
          className={styles.photo}
        />
      ) : (
        <svg
          viewBox="0 0 120 126"
          role="img"
          aria-label={`Sem foto disponível de ${name}`}
          className={styles.placeholder}
        >
          <rect width="120" height="126" className={styles.bgShape} />
          {partyColor ? (
            <rect y="96" width="120" height="30" fill={partyColor} />
          ) : null}
          <circle cx="60" cy="54" r="22" className={styles.shape} />
          <path
            d="M20 126c2-26 18-38 40-38s38 12 40 38z"
            className={styles.shape}
          />
          <text x="60" y="61" textAnchor="middle" className={styles.initials}>
            {initials(name)}
          </text>
        </svg>
      )}
      {photoUrl && partyColor ? (
        <span className={styles.band} style={{ backgroundColor: partyColor }} />
      ) : null}
      {flag ? <span className={styles.flag}>{flag}</span> : null}
    </div>
  );
}
