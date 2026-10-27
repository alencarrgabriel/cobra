import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { Card } from "@/components/Card/Card";
import { PartyBadge } from "@/components/PartyBadge/PartyBadge";
import { Portrait } from "@/components/Portrait/Portrait";
import { SharePanel } from "@/components/SharePanel/SharePanel";
import { UfFlag } from "@/components/UfFlag/UfFlag";
import { WorkStatus } from "@/components/WorkStatus/WorkStatus";
import { shareMetadata } from "@/lib/cards/metadata";
import { FLAGS } from "@/lib/geo/flags";
import {
  officeLabel,
  partyTimeline,
  resultLabel,
} from "@/lib/politicians/elections";
import {
  type CandidacyRow,
  getAmendments,
  getCandidacies,
  getLinkedWorks,
  getPolitician,
  getRelated,
  type Politician,
  type Related,
} from "@/lib/politicians/queries";
import {
  type HouseSlug,
  jsonLd,
  profilePath,
  whoIs,
} from "@/lib/politicians/who";
import {
  formatBRL,
  formatBRLCompact,
  formatDate,
  formatInteger,
} from "@/lib/works/format";

import styles from "./perfil.module.css";

const DESCRIPTION =
  "Mandato, partido, emendas e obras de um político, com fonte oficial.";

export async function generateMetadata({
  params,
}: PageProps<"/politicos/[slug]">): Promise<Metadata> {
  const id = Number(/^\d+/.exec((await params).slug)?.[0] ?? NaN);
  let p: Politician | null = null;
  try {
    p = Number.isFinite(id) ? await getPolitician(id) : null;
  } catch (error) {
    if (!isDataUnavailable(error)) throw error;
  }
  if (!p) return { title: "Perfil", description: DESCRIPTION };
  return shareMetadata({
    title: p.name,
    description: sentence(p),
    path: profilePath(p.id, p.name),
    card: ["politico", p.id, "link"],
    type: "profile",
  });
}

/** The "Quem é" sentence of the current (or latest) mandate. */
function sentence(p: Politician): string {
  const current = p.mandates.find((m) => m.endedOn === null) ?? p.mandates[0];
  return current
    ? whoIs({
        name: p.name,
        house: current.house,
        uf: current.uf,
        status: current.status,
        startedOn: current.startedOn,
        endedOn: current.endedOn,
        party: p.party,
      })
    : `${p.name} está no cadastro do Cobra.`;
}

const HOUSE: Record<HouseSlug, string> = {
  senado: "Senado Federal",
  camara: "Câmara dos Deputados",
  cldf: "Câmara Legislativa do DF",
};
const OFFICE: Record<string, string> = {
  senador: "Senador(a)",
  deputado_federal: "Deputado(a) federal",
  deputado_distrital: "Deputado(a) distrital",
};
const STATUS: Record<string, string> = {
  titular: "Em exercício",
  suplente: "Suplente em exercício",
  licenciado: "Licenciado(a) do exercício",
};
const OFFICIAL: Record<HouseSlug, (id: string) => string | null> = {
  camara: (id) => `https://www.camara.leg.br/deputados/${id}`,
  senado: (id) =>
    `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}`,
  cldf: () => null,
};

// Blocks that need data not collected yet (DDR §9.1: "—" with the reason, never zero).
const NOT_YET: [string, string][] = [
  ["Como votou", "vem com a coleta das votações da Câmara e do Senado"],
  ["Projetos de autoria e relatoria", "vem com a coleta de proposições"],
  ["Presença nas sessões", "vem com a coleta de presença"],
  ["Gastos da cota parlamentar", "vem com a coleta de despesas"],
  ["Patrimônio declarado e doadores", "vem com a coleta do TSE"],
];

export default function ProfilePage({
  params,
}: PageProps<"/politicos/[slug]">) {
  return (
    <main className={`${styles.page} gutter`}>
      <Suspense fallback={<p className={styles.note}>Carregando perfil…</p>}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function load(id: number) {
  const politician = await getPolitician(id);
  if (!politician) return null;
  const current =
    politician.mandates.find((m) => m.endedOn === null) ??
    politician.mandates[0];
  const [amendments, works, related, candidacies] = await Promise.all([
    getAmendments(id),
    getLinkedWorks(id),
    getRelated(id, current?.ufCode ?? null, politician.party?.acronym ?? null),
    getCandidacies(id),
  ]);
  return { politician, current, amendments, works, related, candidacies };
}

async function Profile({ params }: { params: Promise<{ slug: string }> }) {
  const id = Number(/^\d+/.exec((await params).slug)?.[0] ?? NaN);
  // Works show "há N meses", which depends on today: rendered per request.
  await connection();
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = Number.isFinite(id) ? await load(id) : null;
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  if (!data) return <DataUnavailable />;
  const {
    politician: p,
    current,
    amendments,
    works,
    related,
    candidacies,
  } = data;
  const who = sentence(p);
  const total = amendments.reduce(
    (s, a) => ({ committed: s.committed + a.committed, paid: s.paid + a.paid }),
    { committed: 0, paid: 0 },
  );
  const ufName = current ? (FLAGS[current.uf]?.name ?? current.uf) : null;
  const faq = questions(
    p,
    current?.house,
    ufName,
    amendments.length,
    total.committed,
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(structured(p, current?.house, faq)),
        }}
      />
      <header className={styles.header}>
        <div className={styles.portrait}>
          <Portrait
            name={p.name}
            photoUrl={p.photoUrl ?? undefined}
            partyColor={p.party?.color}
            flag={current ? <UfFlag uf={current.uf} /> : undefined}
            size="lg"
          />
        </div>
        <div className={styles.identity}>
          <p className="eyebrow">
            {current
              ? `${OFFICE[current.office] ?? current.office} · ${ufName}`
              : "Político"}
          </p>
          <h1 className={`display ${styles.title}`}>{p.name}</h1>
          <p className={styles.badges}>
            {p.party ? (
              <PartyBadge
                acronym={p.party.acronym}
                color={p.party.color}
                name={p.party.name}
              />
            ) : null}
            {current ? <span>{STATUS[current.status]}</span> : null}
          </p>
          <p className={styles.who} data-testid="quem-e">
            {who}
          </p>
          <p className={styles.note}>Nome civil: {p.civilName}.</p>
          <SharePanel
            path={profilePath(p.id, p.name)}
            text={`${p.name} no Cobra: mandato, partido, emendas e obras, com fonte oficial.`}
            card={{ kind: "politico", id: p.id }}
          />
        </div>
      </header>

      <Card aria-labelledby="mandatos">
        <h2 id="mandatos" className={styles.h2}>
          Mandatos e partidos
        </h2>
        <ul className={styles.list}>
          {p.mandates.map((m) => {
            const official = p.externalIds[m.house]
              ? OFFICIAL[m.house](p.externalIds[m.house]!)
              : null;
            return (
              <li key={`${m.house}-${m.startedOn}`}>
                <strong>{OFFICE[m.office] ?? m.office}</strong> —{" "}
                {HOUSE[m.house]}, {m.uf}. Desde {formatDate(m.startedOn)}
                {m.endedOn ? ` até ${formatDate(m.endedOn)}` : ""}.{" "}
                {m.endedOn ? "Encerrado." : STATUS[m.status]}
                {official ? (
                  <>
                    {" "}
                    <a href={official} rel="noopener noreferrer">
                      Ver no site oficial
                    </a>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
        {p.affiliations.length ? (
          <>
            <h3 className={styles.h3}>Partidos</h3>
            <ul className={styles.list} data-testid="filiacoes">
              {p.affiliations.map((a, i) => (
                <li key={i}>
                  {a.party.name} ({a.party.acronym})
                  {a.startedOn ? `, desde ${formatDate(a.startedOn)}` : ""}
                  {a.endedOn
                    ? ` até ${formatDate(a.endedOn)}`
                    : a.startedOn
                      ? ""
                      : ", filiação atual"}
                  .
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className={styles.source}>
          Fonte: {current ? HOUSE[current.house] : "casas legislativas"}
          {p.collectedAt
            ? `, dados coletados pelo Cobra em ${formatDate(p.collectedAt)}`
            : ""}
          .
        </p>
      </Card>

      <Trajectory candidacies={candidacies} />

      <Card aria-labelledby="emendas" data-testid="emendas">
        <h2 id="emendas" className={styles.h2}>
          Emendas com destino ao DF
        </h2>
        <p className={styles.note}>
          O Cobra guarda, no piloto, as emendas com destino ao Distrito Federal
          e as citadas por obras do DF. Emendas para outros lugares ainda não
          estão aqui.
        </p>
        {current?.house === "cldf" && amendments.length === 0 ? (
          <p data-testid="emendas-distrital">
            Emendas ao orçamento federal são indicadas por deputados federais e
            senadores. As emendas dos deputados distritais ao orçamento do DF
            ainda não estão no Cobra.
          </p>
        ) : amendments.length ? (
          <>
            <p data-testid="emendas-total">
              {amendments.length === 1
                ? "1 emenda"
                : `${formatInteger(amendments.length)} emendas`}
              , com {formatBRL(total.committed)} empenhados e{" "}
              {formatBRL(total.paid)} pagos.
            </p>
            <ul className={styles.list}>
              {amendments.map((a) => (
                <li key={a.code}>
                  <strong>{a.year}</strong> ·{" "}
                  {a.mainFunction ?? "área não informada"} · {a.locality} ·
                  empenhado {formatBRLCompact(a.committed)}, pago{" "}
                  {formatBRLCompact(a.paid)}{" "}
                  <span className={styles.code}>(emenda {a.code})</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>O Cobra não tem emendas deste político com destino ao DF.</p>
        )}
        <p className={styles.source}>Fonte: Portal da Transparência (CGU).</p>
      </Card>

      <Card aria-labelledby="obras" data-testid="obras">
        <h2 id="obras" className={styles.h2}>
          Obras pagas por essas emendas
        </h2>
        {works.length ? (
          <ul className={styles.list}>
            {works.map((w) => (
              <li key={`${w.code}-${w.amendment}`}>
                <Link href={`/obras/${encodeURIComponent(w.code)}`}>
                  {w.name}
                </Link>{" "}
                <WorkStatus status={w.status} />{" "}
                <span className={styles.note}>
                  · vínculo {w.confidence}: um empenho da obra cita a emenda{" "}
                  {w.amendment}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma obra do DF ligada às emendas deste político.</p>
        )}
        <p className={styles.source}>
          Fonte: Obrasgov.br e Portal da Transparência.
        </p>
      </Card>

      <Card aria-labelledby="ainda-nao">
        <h2 id="ainda-nao" className={styles.h2}>
          Ainda não está no Cobra
        </h2>
        <dl className={styles.notYet} data-testid="ainda-nao">
          {NOT_YET.map(([label, why]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <span aria-hidden="true">—</span>
                <span className="sr-only">Sem dado.</span> Ainda não está no
                Cobra: {why}.
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card aria-labelledby="perguntas">
        <h2 id="perguntas" className={styles.h2}>
          Perguntas frequentes
        </h2>
        <dl className={styles.faq}>
          {faq.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card aria-labelledby="relacionados" data-testid="relacionados">
        <h2 id="relacionados" className={styles.h2}>
          Políticos relacionados
        </h2>
        <p className={styles.note}>Em ordem alfabética.</p>
        <RelatedList
          title={
            ufName
              ? `Também ${FLAGS[current!.uf]?.preposition ?? "de"} ${ufName}`
              : null
          }
          people={related.sameUf}
        />
        <RelatedList
          title={p.party ? `Também do ${p.party.name}` : null}
          people={related.sameParty}
        />
      </Card>
    </>
  );
}

function Trajectory({ candidacies }: { candidacies: CandidacyRow[] }) {
  const parties = partyTimeline(candidacies);
  const collected = candidacies
    .map((c) => c.collectedAt)
    .sort()
    .at(-1);
  return (
    <Card aria-labelledby="trajetoria" data-testid="trajetoria">
      <h2 id="trajetoria" className={styles.h2}>
        Trajetória eleitoral
      </h2>
      {candidacies.length ? (
        <>
          <p className={styles.note}>
            Eleições ordinárias desde 1994, da mais recente para a mais antiga,
            como o TSE informa.
          </p>
          <div
            className={styles.tableWrap}
            // Scrolls sideways on small screens, so it must be reachable by keyboard (axe
            // scrollable-region-focusable).
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            role="region"
            aria-label="Tabela da trajetória eleitoral"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">Local</th>
                  <th scope="col">Partido</th>
                  <th scope="col">Votos</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {candidacies.map((c) => (
                  <tr key={`${c.year}-${c.round}-${c.office}`}>
                    <td>
                      {c.year}
                      {c.round === 2 ? " (2º turno)" : ""}
                    </td>
                    <td>{officeLabel(c.office)}</td>
                    <td>{c.unit ?? c.uf ?? "—"}</td>
                    <td>{c.party ?? "—"}</td>
                    <td>{c.votes === null ? "—" : formatInteger(c.votes)}</td>
                    <td>{resultLabel(c.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parties.length ? (
            <>
              <h3 className={styles.h3}>Partidos pelos quais disputou</h3>
              <p data-testid="partidos-disputados">
                {parties
                  .map((p) =>
                    p.from === p.to
                      ? `${p.party} (${p.from})`
                      : `${p.party} (${p.from} a ${p.to})`,
                  )
                  .join(" → ")}
              </p>
            </>
          ) : null}
        </>
      ) : (
        <p>
          O Cobra não encontrou candidaturas deste político nos arquivos do TSE.
          A ligação usa o CPF ou o nome civil e a data de nascimento; um nome
          civil diferente em eleições antigas pode impedir que elas apareçam.
        </p>
      )}
      <p className={styles.source}>
        Fonte: Tribunal Superior Eleitoral (TSE), dados abertos
        {collected ? `, coletados pelo Cobra em ${formatDate(collected)}` : ""}.
      </p>
    </Card>
  );
}

function RelatedList({
  title,
  people,
}: {
  title: string | null;
  people: Related[];
}) {
  if (!title || people.length === 0) return null;
  return (
    <>
      <h3 className={styles.h3}>{title}</h3>
      <ul className={styles.related}>
        {people.map((r) => (
          <li key={r.id}>
            <Link href={profilePath(r.id, r.name)}>{r.name}</Link>{" "}
            <span className={styles.note}>
              ({[r.party, r.uf].filter(Boolean).join(", ")})
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function questions(
  p: Politician,
  house: HouseSlug | undefined,
  ufName: string | null,
  amendments: number,
  committed: number,
): [string, string][] {
  const current = p.mandates.find((m) => m.endedOn === null);
  const list: [string, string][] = [];
  list.push([
    `Qual é o partido de ${p.name}?`,
    p.party
      ? `${p.party.name} (${p.party.acronym}), segundo a fonte oficial.`
      : "A fonte não informa filiação atual.",
  ]);
  if (house && ufName)
    list.push([
      `Por qual estado ${p.name} tem mandato?`,
      `${ufName}, no ${HOUSE[house]}.`,
    ]);
  if (current)
    list.push([
      `Desde quando ${p.name} está no mandato atual?`,
      `Desde ${formatDate(current.startedOn)}.`,
    ]);
  list.push([
    `${p.name} indicou emendas para o DF?`,
    amendments
      ? `O Cobra tem ${formatInteger(amendments)} ${amendments === 1 ? "emenda" : "emendas"} com destino ao DF, com ${formatBRL(committed)} empenhados.`
      : "O Cobra não tem emendas deste político com destino ao DF.",
  ]);
  return list;
}

function structured(
  p: Politician,
  house: HouseSlug | undefined,
  faq: [string, string][],
) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: p.name,
      ...(p.photoUrl ? { image: p.photoUrl } : {}),
      ...(house ? { jobTitle: HOUSE[house] } : {}),
      ...(p.party
        ? { memberOf: { "@type": "PoliticalParty", name: p.party.name } }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
}
