import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Card } from "@/components/Card/Card";
import { WorkStatus } from "@/components/WorkStatus/WorkStatus";
import {
  formatBRL,
  formatDate,
  formatInteger,
  STATUS_INFO,
} from "@/lib/works/format";
import { getWork, type Party, type WorkDetail } from "@/lib/works/queries";

import { DataUnavailable, isDataUnavailable } from "../DataUnavailable";
import styles from "../obras.module.css";
import { SourceNote } from "../SourceNote";
import ficha from "./ficha.module.css";

// The page waits for the database before responding so that an unknown code gets a real
// 404 status instead of a streamed "not found" (design D2).
export const instant = false;

async function load(code: string): Promise<WorkDetail | null | "unavailable"> {
  try {
    return await getWork(code);
  } catch (error) {
    if (isDataUnavailable(error)) return "unavailable";
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/obras/[codigo]">): Promise<Metadata> {
  const work = await load((await params).codigo);
  if (!work || work === "unavailable") return { title: "Obra" };
  return {
    title: work.name,
    description: `${STATUS_INFO[work.status].label}. Obra com dinheiro federal no Distrito Federal, segundo o Obrasgov.br.`,
  };
}

export default async function WorkPage({
  params,
}: PageProps<"/obras/[codigo]">) {
  const work = await load((await params).codigo);
  // "há N meses" depends on today's date, so the page is rendered per request.
  await connection();
  if (work === null) notFound();
  if (work === "unavailable") {
    return (
      <main className={`${styles.page} gutter`}>
        <DataUnavailable />
      </main>
    );
  }
  const dates: [string, string | null][] = [
    ["Início previsto", work.plannedStart],
    ["Término previsto", work.plannedEnd],
    ["Início real", work.actualStart],
    ["Término real", work.actualEnd],
  ];
  return (
    <main className={`${styles.page} gutter`}>
      <p>
        <Link href="/obras">← Todas as obras do DF</Link>
      </p>
      <header className={styles.header}>
        <p className="eyebrow">{work.type ?? "Obra"}</p>
        <h1 className={`display ${ficha.title}`}>{work.name}</h1>
        <WorkStatus status={work.status} stoppedSince={work.stoppedSince} />
        {work.status === "registered" ? (
          <p className={styles.note}>{STATUS_INFO.registered.hint}.</p>
        ) : null}
        {work.address ? <p className={styles.lead}>{work.address}</p> : null}
      </header>

      <Card aria-labelledby="numeros">
        <h2 id="numeros" className={styles.h2}>
          Valor e andamento
        </h2>
        <dl className={styles.totals}>
          <div>
            <dt>Valor previsto</dt>
            <dd>
              {work.plannedValue !== null
                ? formatBRL(work.plannedValue)
                : "Não informado"}
            </dd>
          </div>
          <div>
            <dt>Execução física</dt>
            <dd>
              {work.progress !== null
                ? `${formatInteger(work.progress)}%`
                : "Não informada"}
            </dd>
          </div>
        </dl>
        {work.progress !== null && work.progressUpdatedOn ? (
          <p className={styles.note}>
            Percentual informado em {formatDate(work.progressUpdatedOn)}.
          </p>
        ) : null}
      </Card>

      {work.qualityNotes.length > 0 ? (
        <Card aria-labelledby="qualidade" data-testid="notas-qualidade">
          <h2 id="qualidade" className={styles.h2}>
            Atenção aos dados
          </h2>
          <ul className={ficha.notes}>
            {work.qualityNotes.map((n) => (
              <li key={n}>{n.charAt(0).toUpperCase() + n.slice(1)}.</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card aria-labelledby="prazos">
        <h2 id="prazos" className={styles.h2}>
          Prazos
        </h2>
        <dl className={ficha.fields}>
          {dates.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value ? formatDate(value) : "Não informado"}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {work.events.length > 0 ? (
        <Card aria-labelledby="historico" data-testid="historico">
          <h2 id="historico" className={styles.h2}>
            Paralisações e cancelamentos
          </h2>
          <ol className={ficha.events}>
            {work.events.map((e, i) => (
              <li key={i}>
                <p className={ficha.eventHead}>
                  {e.status}
                  {e.occurredOn ? ` em ${formatDate(e.occurredOn)}` : ""}
                </p>
                {e.justification ? (
                  <blockquote className={ficha.quote}>
                    {e.justification}
                  </blockquote>
                ) : null}
                {e.inNegotiation ? (
                  <p className={styles.note}>
                    Em negociação para retomada
                    {e.negotiationPhase
                      ? `: ${e.negotiationPhase.replace(/[.\s]+$/, "")}`
                      : ""}
                    .
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          <p className={styles.note}>
            Justificativas como registradas pelos gestores.
          </p>
        </Card>
      ) : null}

      <Card aria-labelledby="quem">
        <h2 id="quem" className={styles.h2}>
          Quem participa
        </h2>
        <dl className={ficha.fields}>
          <PartyField
            label="Órgão responsável"
            parties={
              work.responsibleOrg
                ? [{ name: work.responsibleOrg, cnpj: null }]
                : []
            }
          />
          <PartyField label="Repassa o dinheiro" parties={work.transferors} />
          <PartyField label="Recebe o dinheiro" parties={work.recipients} />
          <PartyField label="Executa a obra" parties={work.executors} />
        </dl>
      </Card>

      <Card aria-labelledby="sobre">
        <h2 id="sobre" className={styles.h2}>
          Sobre a obra
        </h2>
        <dl className={ficha.fields}>
          {(
            [
              ["Descrição", work.description],
              ["Para que serve", work.socialFunction],
              ["Natureza", work.nature],
              ["Tipo de intervenção", work.species],
              [
                "Área",
                [work.type, work.subtype].filter(Boolean).join(" / ") || null,
              ],
              ["Código no Obrasgov.br", work.code],
            ] as [string, string | null][]
          ).map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
        {!work.hasLocation ? (
          <p className={styles.note}>
            A fonte não informa a localização desta obra.
          </p>
        ) : null}
      </Card>

      <SourceNote
        updatedAt={work.sourceUpdatedAt}
        collectedAt={work.collectedAt}
        url={work.sourceUrl ?? undefined}
      />
    </main>
  );
}

function PartyField({ label, parties }: { label: string; parties: Party[] }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {parties.length === 0
          ? "Não informado"
          : parties.map((p) => p.name).join("; ")}
      </dd>
    </div>
  );
}
