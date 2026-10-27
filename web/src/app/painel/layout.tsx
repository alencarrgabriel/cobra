import type { Metadata } from "next";

import styles from "./painel.module.css";

// Editorial panel (change painel-editorial): kept out of search engines.
export const metadata: Metadata = {
  title: { default: "Painel editorial", template: "%s | Painel editorial" },
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: LayoutProps<"/painel">) {
  return <main className={`${styles.page} gutter`}>{children}</main>;
}
