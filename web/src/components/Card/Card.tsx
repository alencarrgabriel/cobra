import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Card.module.css";

type Props = HTMLAttributes<HTMLElement> & {
  as?: "section" | "div" | "article";
  children: ReactNode;
};

/** Framed surface for a self-contained block of the page. */
export function Card({
  as: Tag = "section",
  className,
  children,
  ...rest
}: Props) {
  return (
    <Tag
      className={[styles.card, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
