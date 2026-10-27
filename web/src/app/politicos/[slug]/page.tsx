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
import { formatPercent, withVariation } from "@/lib/politicians/assets";
import {
  officeLabel,
  partyTimeline,
  resultLabel,
} from "@/lib/politicians/elections";
import {
  type AssetsData,
  type BallotRow,
  type ReceiptsData,
  type CandidacyRow,
  getAmendments,
  getAssets,
  getCandidacies,
  getRecentBallots,
  getReceipts,
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
  const [amendments, works, related, candidacies, assets, receipts, ballots] =
    await Promise.all([
      getAmendments(id),
      getLinkedWorks(id),
      getRelated(
        id,
        current?.ufCode ?? null,
        politician.party?.acronym ?? null,
      ),
      getCandidacies(id),
      getAssets(id),
      getReceipts(id),
      getRecentBallots(id),
    ]);
  return {
    politician,
    current,
    amendments,
    works,
    related,
    candidacies,
    assets,
    receipts,
    ballots,
  };
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
    assets,
    receipts,
    ballots,
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

      <HowVoted ballots={ballots} house={current?.house} />

      <Trajectory candidacies={candidacies} />

      <Assets data={assets} />

      <Receipts data={receipts} />

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
          {NOT_YET.filter(([label]) => label !== "Como votou").map(
            ([label, why]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Sem dado.</span> Ainda não está no
                  Cobra: {why}.
                </dd>
              </div>
            ),
          )}
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

const CATEGORIES = [
  ["imoveis", "Imóveis"],
  ["veiculos", "Veículos"],
  ["dinheiro", "Dinheiro e aplicações"],
  ["outros", "Outros"],
] as const;

function variationText(v: { value: number; percent: number | null }): string {
  const sign = v.value >= 0 ? "+" : "−";
  const percent = formatPercent(v.percent);
  return `${sign}${formatBRLCompact(Math.abs(v.value))}${percent ? ` (${percent})` : ""}`;
}

function Assets({ data }: { data: AssetsData }) {
  const rows = withVariation(data.declarations);
  const has2006 = rows.some((r) => r.year === 2006 && r.total !== null);
  return (
    <Card aria-labelledby="patrimonio" data-testid="patrimonio">
      <h2 id="patrimonio" className={styles.h2}>
        Patrimônio declarado
      </h2>
      {rows.length ? (
        <>
          <p className={styles.note}>
            Valores declarados pelo candidato ao TSE em cada eleição desde 2006,
            sem correção pela inflação. A variação compara com a declaração
            anterior.
            {has2006
              ? " Em 2006 o TSE não informa o tipo dos bens: todos aparecem em Outros."
              : ""}
          </p>
          <div
            className={styles.tableWrap}
            // Scrolls sideways on small screens, so it must be reachable by keyboard (axe
            // scrollable-region-focusable).
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            role="region"
            aria-label="Tabela do patrimônio declarado"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">Total</th>
                  {CATEGORIES.map(([key, label]) => (
                    <th key={key} scope="col">
                      {label}
                    </th>
                  ))}
                  <th scope="col">Variação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{officeLabel(r.office)}</td>
                    {r.total === null ? (
                      <td colSpan={5}>Nenhum bem declarado ao TSE</td>
                    ) : (
                      <>
                        <td>{formatBRLCompact(r.total)}</td>
                        {CATEGORIES.map(([key]) => (
                          <td key={key}>{formatBRLCompact(r[key])}</td>
                        ))}
                      </>
                    )}
                    <td>{r.variation ? variationText(r.variation) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p>
          O Cobra não tem declarações de bens deste político: o TSE publica os
          bens a partir de 2006, e não há candidatura dele desde então nos
          arquivos.
        </p>
      )}
      <p className={styles.source}>
        Fonte: Tribunal Superior Eleitoral (TSE), bens de candidatos
        {data.collectedAt
          ? `, coletados pelo Cobra em ${formatDate(data.collectedAt)}`
          : ""}
        .
      </p>
    </Card>
  );
}

const OPTION: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  abstencao: "Abstenção",
  obstrucao: "Obstrução",
  art17: "Art. 17",
  presidente: "Presidente da sessão (não vota)",
  presente_sem_voto: "Presente, sem registrar voto",
  ausente: "Ausente",
  nao_informado: "Não informado",
};

/** The option, with the reason the house gives for an absence (e.g. "Ausente: Licença saúde"). */
function optionText(b: BallotRow): string {
  const label = OPTION[b.option] ?? b.option;
  return b.optionDetail ? `${label}: ${b.optionDetail}` : label;
}

const VOTES_OF: Partial<Record<HouseSlug, { house: string; note: string }>> = {
  camara: {
    house: "Câmara dos Deputados",
    note: "Votações simbólicas não têm voto individual.",
  },
  senado: {
    house: "Senado Federal",
    note: "Votações secretas e simbólicas não têm voto individual.",
  },
};

function HowVoted({
  ballots,
  house,
}: {
  ballots: BallotRow[];
  house: HouseSlug | undefined;
}) {
  const collected = ballots
    .map((b) => b.collectedAt)
    .sort()
    .at(-1);
  return (
    <Card aria-labelledby="como-votou" data-testid="como-votou">
      <h2 id="como-votou" className={styles.h2}>
        Como votou
      </h2>
      {!house || !VOTES_OF[house] ? (
        <p>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Sem dado.</span> Ainda não está no Cobra: as
          votações da Câmara Legislativa não são coletadas.
        </p>
      ) : ballots.length ? (
        <>
          <p className={styles.note}>
            As 10 votações nominais mais recentes do Plenário (
            {VOTES_OF[house]!.house}) com voto ou ausência registrados.{" "}
            {VOTES_OF[house]!.note}
          </p>
          <ul className={styles.list}>
            {ballots.map((b) => (
              <li key={b.voteId}>
                <strong>{formatDate(b.occurredOn)}</strong> ·{" "}
                {b.propositionLabel ? (
                  b.propositionUrl ? (
                    <a href={b.propositionUrl} rel="noopener noreferrer">
                      {b.propositionLabel}
                    </a>
                  ) : (
                    b.propositionLabel
                  )
                ) : (
                  "Votação"
                )}
                {b.propositionSummary ? `: ${b.propositionSummary}` : ""}{" "}
                <span className={styles.note}>
                  ({b.description}
                  {b.approved === true
                    ? " Resultado: aprovado."
                    : b.approved === false
                      ? " Resultado: rejeitado."
                      : ""}
                  )
                </span>{" "}
                <span data-testid="voto">Voto: {optionText(b)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          O Cobra não tem votos nominais deste parlamentar no Plenário desde
          2023.
        </p>
      )}
      {house && VOTES_OF[house] ? (
        <p className={styles.source}>
          Fonte: {VOTES_OF[house]!.house}, dados abertos de votações
          {collected
            ? `, coletados pelo Cobra em ${formatDate(collected)}`
            : ""}
          .
        </p>
      ) : null}
    </Card>
  );
}

const ORIGIN: Record<string, string> = {
  partidos: "Partidos",
  pessoas_fisicas: "Pessoas físicas",
  proprios: "Recursos próprios",
  financiamento_coletivo: "Financiamento coletivo",
  outros_candidatos: "Outros candidatos",
  outras: "Outras origens",
};

function share(part: number, total: number): string {
  return total > 0 ? ` (${Math.round((part / total) * 100)}%)` : "";
}

function Receipts({ data }: { data: ReceiptsData }) {
  return (
    <Card aria-labelledby="receitas" data-testid="receitas">
      <h2 id="receitas" className={styles.h2}>
        Receitas de campanha
      </h2>
      <p className={styles.note}>
        Valores informados pelo candidato ao TSE nas eleições desde 2018,
        incluindo doações estimáveis em dinheiro (bens e serviços). Doadores
        pessoas físicas aparecem só somados.
      </p>
      {data.years.length ? (
        data.years.map((y) => (
          <section key={y.year} aria-labelledby={`receitas-${y.year}`}>
            <h3 id={`receitas-${y.year}`} className={styles.h3}>
              {y.year}: {formatBRLCompact(y.total)}
            </h3>
            <ul className={styles.list}>
              {Object.keys(ORIGIN)
                .map((key) => y.byOrigin.find((o) => o.origin === key))
                .filter((o) => o !== undefined)
                .map((o) => (
                  <li key={o.origin}>
                    {ORIGIN[o.origin]}: {formatBRLCompact(o.total)}
                    {share(o.total, y.total)}
                  </li>
                ))}
            </ul>
            <p>
              Do Fundo Especial de Financiamento de Campanha:{" "}
              {formatBRLCompact(y.fefc)}. Do Fundo Partidário:{" "}
              {formatBRLCompact(y.partyFund)}.
            </p>
            {y.privateDonors ? (
              <p data-testid={`pessoas-fisicas-${y.year}`}>
                {y.privateDonors === 1
                  ? "1 pessoa física doou"
                  : `${formatInteger(y.privateDonors)} pessoas físicas doaram`}{" "}
                {formatBRLCompact(y.privateTotal)}.
              </p>
            ) : null}
            {y.parties.length ? (
              <>
                <p className={styles.note}>
                  Partidos doadores, em ordem alfabética:
                </p>
                <ul className={styles.list}>
                  {y.parties.map((p) => (
                    <li key={p.name}>
                      {p.name}: {formatBRLCompact(p.total)}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ))
      ) : (
        <p>
          O Cobra não tem receitas de campanha deste político: elas são
          coletadas a partir da eleição de 2018.
        </p>
      )}
      <p className={styles.source}>
        Fonte: Tribunal Superior Eleitoral (TSE), prestação de contas eleitorais
        {data.collectedAt
          ? `, coletada pelo Cobra em ${formatDate(data.collectedAt)}`
          : ""}
        .
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
