import { flagAlt, flagSrc } from "@/lib/geo/flags";

import styles from "./UfFlag.module.css";

type Props = { uf: string; size?: "sm" | "md" };

/** State flag served by the site itself, the same size for every state (DDR §9.1). */
export function UfFlag({ uf, size = "sm" }: Props) {
  return (
    // Plain <img>: small static SVGs that need no resizing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagSrc(uf)}
      alt={flagAlt(uf)}
      className={`${styles.flag} ${styles[size]}`}
      loading="lazy"
      decoding="async"
    />
  );
}
