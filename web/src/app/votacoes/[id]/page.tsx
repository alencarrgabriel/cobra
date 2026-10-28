import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { Card } from "@/components/Card/Card";
import { SharePanel } from "@/components/SharePanel/SharePanel";
import { VoteSplitBar } from "@/components/Vote/Vote";
import { shareMetadata } from "@/lib/cards/metadata";
import { relevanceText } from "@/lib/politicians/relevance";
import { profilePath } from "@/lib/politicians/who";
import { HOUSE_NAME, optionText, tally } from "@/lib/votes/options";
import { getVote, type VoteDetail } from "@/lib/votes/queries";
import { formatDate, formatInteger } from "@/lib/works/format";

import styles from "../votacoes.module.css";

const ORIENTATION: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  liberado: "Liberado",
  obstrucao: "Obstrução",
  abstencao: "Abstenção",
  nao_informada: "Não informada",
};

const CRITERIA_HELP: Record<string, string> = {
  divergencia: "Governo e Oposição orientaram posições diferentes.",
  placar_disputado:
    "A diferença entre Sim e Não foi menor que 20% dos votantes.",
  tipo_de_materia:
    "É PEC, medida provisória, lei complementar, lei orçamentária ou veto.",
  curadoria: "Incluída pela equipe editorial, com justificativa publicada.",
};

async function load(id: string): Promise<VoteDetail | null | "unavailable"> {
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  try {
    return await getVote(n);
  } catch (error) {
    if (isDataUnavailable(error)) return "unavailable";
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/votacoes/[id]">): Promise<Metadata> {
  const vote = await load((await params).id);
  if (!vote || vote === "unavailable") return { title: "Votação" };
  const title = `${vote.label ?? "Votação"} · ${HOUSE_NAME[vote.house]}, ${formatDate(vote.occurredOn)}`;
  return shareMetadata({
    title,
    description: `${vote.description} Sim ${vote.yes}, Não ${vote.no}, outros ${vote.other}.`,
    path: `/votacoes/${vote.id}`,
    card: ["votacao", vote.id, "link"],
  });
}

export default function VotePage({ params }: PageProps<"/votacoes/[id]">) {
  return (
    <main className={`${styles.page} gutter`}>
      <p>
        <Link href="/votacoes">← Votações</Link>
      </p>
      <Suspense fallback={<p className={styles.note}>Carregando votação…</p>}>
        <Vote params={params} />
      </Suspense>
    </main>
  );
}

async function Vote({ params }: { params: Promise<{ id: string }> }) {
  const vote = await load((await params).id);
  if (!vote || vote === "unavailable") return <DataUnavailable />;
  const individual =
    vote.nominal && vote.ballotsChecked && vote.ballots.length > 0;
  return (
    <>
      <header className={styles.header}>
        <p className="eyebrow">
          {formatDate(vote.occurredOn)} · {HOUSE_NAME[vote.house]}
        </p>
        <h1 className={`display ${styles.title}`}>{vote.label ?? "Votação"}</h1>
        {vote.propositionSummary ? (
          <p className={styles.lead}>{vote.propositionSummary}</p>
        ) : null}
        <p>{vote.description}</p>
        <p>
          Resultado:{" "}
          <strong>
            {vote.approved === true
              ? "aprovado"
              : vote.approved === false
                ? "rejeitado"
                : "—"}
          </strong>
          .
        </p>
        {vote.propositionUrl ? (
          <p>
            <a href={vote.propositionUrl} rel="noopener noreferrer">
              Proposição no site oficial
            </a>
          </p>
        ) : null}
        <SharePanel
          path={`/votacoes/${vote.id}`}
          text={`${vote.label ?? "Votação"} (${HOUSE_NAME[vote.house]}, ${formatDate(vote.occurredOn)}): Sim ${vote.yes}, Não ${vote.no}. Veja no Cobra.`}
          card={{ kind: "votacao", id: vote.id }}
        />
      </header>

      <Card aria-labelledby="placar">
        <h2 id="placar" className={styles.h2}>
          Placar oficial
        </h2>
        <VoteSplitBar
          yes={vote.yes}
          no={vote.no}
          other={vote.other}
          size="lg"
        />
        <p data-testid="placar-oficial">
          Sim {formatInteger(vote.yes)} · Não {formatInteger(vote.no)} · outros{" "}
          {formatInteger(vote.other)}
        </p>
        {vote.secret ? (
          <p className={styles.note} data-testid="sem-votos">
            Votação secreta: o Senado informa só os totais, sem o voto de cada
            senador.
          </p>
        ) : !vote.nominal ? (
          <p className={styles.note} data-testid="sem-votos">
            Votação simbólica: sem registro de voto individual.
          </p>
        ) : !vote.ballotsChecked ? (
          <p className={styles.note} data-testid="sem-votos">
            Os votos individuais desta votação não conferem com o placar oficial
            e não são mostrados.
          </p>
        ) : null}
        {vote.criteria.length ? (
          <>
            <p data-testid="relevancia">
              {relevanceText(vote.criteria, vote.propositionType)}.
            </p>
            <ul className={styles.note}>
              {vote.criteria.map((c) => (
                <li key={c}>{CRITERIA_HELP[c] ?? c}</li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      <Card aria-labelledby="resumo">
        <h2 id="resumo" className={styles.h2}>
          Resumo
        </h2>
        {vote.summary ? (
          <p className={styles.summary} data-testid="resumo">
            {vote.summary.text}{" "}
            <span className={styles.note}>
              Resumo revisado por pessoas em{" "}
              {formatDate(vote.summary.approvedAt)}
              {vote.summary.aiModel
                ? ", a partir de um rascunho feito com IA"
                : ""}
              .
            </span>
          </p>
        ) : (
          <p data-testid="sem-resumo">
            O resumo desta votação ainda não foi revisado pela equipe.
          </p>
        )}
      </Card>

      {vote.orientations.length ? (
        <Card aria-labelledby="orientacoes">
          <h2 id="orientacoes" className={styles.h2}>
            Orientação das lideranças
          </h2>
          <ul className={styles.reps} data-testid="orientacoes">
            {vote.orientations.map((o) => (
              <li key={o.bench}>
                {o.bench}: {ORIENTATION[o.orientation] ?? o.orientation}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {individual ? (
        <>
          <TallyTable
            title="Placar por partido"
            id="por-partido"
            rows={tally(vote.ballots, "party")}
            head="Partido"
          />
          <TallyTable
            title="Placar por UF"
            id="por-uf"
            rows={tally(vote.ballots, "uf")}
            head="UF"
          />
          <Card aria-labelledby="votos">
            <h2 id="votos" className={styles.h2}>
              Como cada um votou
            </h2>
            <p className={styles.note}>
              Em ordem alfabética, com o partido e a UF na data.
            </p>
            <ul className={styles.reps} data-testid="lista-de-votos">
              {vote.ballots.map((b, i) => (
                <li key={`${b.name}-${i}`}>
                  {b.politicianId ? (
                    <Link href={profilePath(b.politicianId, b.name)}>
                      {b.name}
                    </Link>
                  ) : (
                    b.name
                  )}{" "}
                  ({[b.party, b.uf].filter(Boolean).join("-")}):{" "}
                  {optionText(b.option, b.detail)}
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}

      <p className={styles.source}>
        Fonte: {HOUSE_NAME[vote.house]}, dados abertos de votações; coletados
        pelo Cobra em {formatDate(vote.collectedAt)}.
      </p>
    </>
  );
}

function TallyTable({
  title,
  id,
  head,
  rows,
}: {
  title: string;
  id: string;
  head: string;
  rows: ReturnType<typeof tally>;
}) {
  return (
    <Card aria-labelledby={id}>
      <h2 id={id} className={styles.h2}>
        {title}
      </h2>
      <div
        className={styles.tableWrap}
        // Scrolls sideways on small screens, so it must be reachable by keyboard (axe
        // scrollable-region-focusable).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        <table className={styles.table} data-testid={id}>
          <thead>
            <tr>
              <th scope="col">{head}</th>
              <th scope="col">Sim</th>
              <th scope="col">Não</th>
              <th scope="col">Outros</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.key}</td>
                <td>{r.yes}</td>
                <td>{r.no}</td>
                <td>{r.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
