import type { ButtonHTMLAttributes } from "react";

import styles from "./FilterChip.module.css";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  selected: boolean;
};

/** Toggle used in filter groups; wrap a set of chips in role="group" with an aria-label. */
export function FilterChip({ selected, className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[styles.chip, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
