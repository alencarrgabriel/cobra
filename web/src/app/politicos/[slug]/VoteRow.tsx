import Link from "next/link";

import { VoteChip } from "@/components/Vote/Vote";
import { relevanceText } from "@/lib/politicians/relevance";
import type { BallotRow } from "@/lib/politicians/queries";
import { optionText, voteTone } from "@/lib/votes/options";
import { formatDate } from "@/lib/works/format";

import styles from "./perfil.module.css";

/** A vote of the politician, as one row: the vote first, then what was voted (design D3). */
export function VoteRow({ b }: { b: BallotRow }) {
  const relevance = relevanceText(b.criteria, b.propositionType);
  const result =
    b.approved === true
      ? "Aprovado"
      : b.approved === false
        ? "Rejeitado"
        : null;
  return (
    <li className={styles.voteRow}>
      <div className={styles.voteChip}>
        <VoteChip tone={voteTone(b.option)}>
          {optionText(b.option, b.optionDetail)}
        </VoteChip>
      </div>
      <div className={styles.voteMain}>
        <Link href={`/votacoes/${b.voteId}`} className={styles.voteTitle}>
          {b.propositionLabel ?? "Votação"}
        </Link>
        <p className={styles.voteText}>
          {b.propositionSummary ?? b.description}
        </p>
        {relevance || b.summary ? (
          <details className={styles.voteDetails}>
            <summary>Mais sobre esta votação</summary>
            {relevance ? (
              <p className={styles.note} data-testid="relevancia">
                {relevance}.
              </p>
            ) : null}
            {b.summary ? (
              <p className={styles.summary} data-testid="resumo">
                {b.summary.text}{" "}
                <span className={styles.note}>
                  Resumo revisado por pessoas em{" "}
                  {formatDate(b.summary.approvedAt)}
                  {b.summary.aiModel
                    ? ", a partir de um rascunho feito com IA"
                    : ""}
                  .
                </span>
              </p>
            ) : null}
            <p className={styles.note}>{b.description}</p>
          </details>
        ) : null}
      </div>
      <p className={styles.voteMeta}>
        <time dateTime={b.occurredOn}>{formatDate(b.occurredOn)}</time>
        {result ? <span>{result}</span> : null}
      </p>
    </li>
  );
}
