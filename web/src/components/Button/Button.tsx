import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import styles from "./Button.module.css";

type Variant = "default" | "primary" | "whatsapp";

type Common = { variant?: Variant; icon?: ReactNode; children: ReactNode };
type AsButton = Common &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Button(props: AsButton | AsLink) {
  const { variant = "default", icon, children, className, ...rest } = props;
  const cls = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </>
  );
  if ("href" in rest && rest.href !== undefined) {
    return (
      <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
