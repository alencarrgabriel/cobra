import Link from "next/link";

import { Card } from "@/components/Card/Card";
import { VoteSplitBar } from "@/components/Vote/Vote";
import { relevanceText } from "@/lib/politicians/relevance";
import { HOUSE_NAME, optionText } from "@/lib/votes/options";
import type { RepresentativeVote, VoteSummary } from "@/lib/votes/queries";
import { formatDate, formatInteger } from "@/lib/works/format";

import styles from "./votacoes.module.css";

/** A vote in the feed (change feed-e-pagina-votacao, design D1 and D2). */
export function VoteCard({
  vote,
  reps,
  placeName,
}: {
  vote: VoteSummary;
  reps: RepresentativeVote[] | null;
  placeName: string | null;
}) {
  const relevance = relevanceText(vote.criteria, vote.propositionType);
  return (
    <Card aria-labelledby={`votacao-${vote.id}`} data-testid="evento">
      <p className="eyebrow">
        {formatDate(vote.occurredOn)} · {HOUSE_NAME[vote.house]}
      </p>
      <h2 id={`votacao-${vote.id}`} className={styles.h2}>
        <Link href={`/votacoes/${vote.id}`}>{vote.label ?? "Votação"}</Link>
      </h2>
      {vote.propositionSummary ? <p>{vote.propositionSummary}</p> : null}
      <p className={styles.note}>
        {vote.description}{" "}
        {vote.approved === true
          ? "Resultado: aprovado."
          : vote.approved === false
            ? "Resultado: rejeitado."
            : ""}
      </p>
      {vote.kind === "votacao_simbolica" ? (
        <p className={styles.note}>
          Votação simbólica: sem registro de voto individual.
        </p>
      ) : (
        <>
          <VoteSplitBar yes={vote.yes} no={vote.no} other={vote.other} />
          <p className={styles.note}>
            Sim {formatInteger(vote.yes)} · Não {formatInteger(vote.no)} ·
            outros {formatInteger(vote.other)}
            {relevance ? ` · ${relevance}` : ""}
          </p>
        </>
      )}
      {vote.summary ? (
        <p className={styles.summary} data-testid="resumo">
          {vote.summary.text}{" "}
          <span className={styles.note}>
            Resumo revisado por pessoas em {formatDate(vote.summary.approvedAt)}
            {vote.summary.aiModel
              ? ", a partir de um rascunho feito com IA"
              : ""}
            .
          </span>
        </p>
      ) : null}
      {reps && placeName && vote.kind === "votacao_relevante" ? (
        vote.ballotsChecked ? (
          reps.length ? (
            <>
              <h3 className={styles.h3}>
                Como votaram os representantes {placeName}
              </h3>
              <ul className={styles.reps} data-testid="votos-do-lugar">
                {reps.map((r) => (
                  <li key={r.politicianId}>
                    {r.name}
                    {r.party ? ` (${r.party})` : ""}:{" "}
                    {optionText(r.option, r.detail)}
                  </li>
                ))}
              </ul>
            </>
          ) : null
        ) : (
          <p className={styles.note}>
            Os votos individuais desta votação não conferem com o placar oficial
            e não são mostrados.
          </p>
        )
      ) : null}
      <p className={styles.source}>
        Fonte: {HOUSE_NAME[vote.house]}, dados abertos; coletados pelo Cobra em{" "}
        {formatDate(vote.collectedAt)}.
      </p>
    </Card>
  );
}
