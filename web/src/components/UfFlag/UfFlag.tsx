import { flagAlt, flagSrc } from "@/lib/geo/flags";

import styles from "./UfFlag.module.css";

type Props = {
  uf: string;
  size?: "sm" | "md";
  /** Next to the state's name already, so screen readers skip it. */
  decorative?: boolean;
};

/** State flag served by the site itself, the same size for every state (DDR §9.1). */
export function UfFlag({ uf, size = "sm", decorative = false }: Props) {
  return (
    // Plain <img>: small static SVGs that need no resizing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagSrc(uf)}
      alt={decorative ? "" : flagAlt(uf)}
      className={`${styles.flag} ${styles[size]}`}
      loading="lazy"
      decoding="async"
    />
  );
}
