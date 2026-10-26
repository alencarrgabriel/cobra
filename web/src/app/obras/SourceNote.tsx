import { formatDate } from "@/lib/works/format";

import styles from "./obras.module.css";

/** Official source and dates shown with every works number (spec obras-na-cidade). */
export function SourceNote({
  updatedAt,
  collectedAt,
  url = "https://obrasgov.gestao.gov.br/",
}: {
  updatedAt: string | null;
  collectedAt: string | null;
  url?: string;
}) {
  return (
    <p className={styles.source} data-testid="fonte">
      Fonte:{" "}
      <a href={url} rel="noopener noreferrer">
        Obrasgov.br
      </a>
      {updatedAt ? `, base atualizada em ${formatDate(updatedAt)}` : ""}
      {collectedAt ? `, coletada pelo Cobra em ${formatDate(collectedAt)}` : ""}
      . Dados informados pelos gestores das obras.
    </p>
  );
}
