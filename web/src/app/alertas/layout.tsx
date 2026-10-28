import type { Metadata } from "next";

import styles from "./alertas.module.css";

// Alerts sign-up (change alertas-cadastro): links carry tokens, so pages send no referrer.
export const metadata: Metadata = {
  title: { default: "Alertas por e-mail", template: "%s | Alertas" },
  referrer: "no-referrer",
};

export default function AlertsLayout({ children }: LayoutProps<"/alertas">) {
  return <main className={`${styles.page} gutter`}>{children}</main>;
}
