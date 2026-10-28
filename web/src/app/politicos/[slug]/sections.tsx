import Link from "next/link";
import { Card } from "@/components/Card/Card";
import { formatPercent, withVariation } from "@/lib/politicians/assets";
import { percent } from "@/lib/politicians/attendance";
import {
  officeLabel,
  partyTimeline,
  resultLabel,
} from "@/lib/politicians/elections";
import {
  type AssetsData,
  type AttendanceData,
  type BallotRow,
  type ExpensesData,
  type ReceiptsData,
  type CandidacyRow,
  type Politician,
  type Related,
} from "@/lib/politicians/queries";
import { type HouseSlug, profilePath } from "@/lib/politicians/who";
import {
  formatBRL,
  formatBRLCompact,
  formatDate,
  formatInteger,
} from "@/lib/works/format";

import styles from "./perfil.module.css";
import { HOUSE } from "./shared";
import { VoteRow } from "./VoteRow";

export function Trajectory({ candidacies }: { candidacies: CandidacyRow[] }) {
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

export function Assets({ data }: { data: AssetsData }) {
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

export function HowVoted({
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
          <ul className={styles.votes} data-testid="votos">
            {ballots.map((b) => (
              <VoteRow key={b.voteId} b={b} />
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

export function Attendance({ data }: { data: AttendanceData | null }) {
  const senate = data?.house === "senado";
  return (
    <Card aria-labelledby="presenca" data-testid="presenca">
      <h2 id="presenca" className={styles.h2}>
        Presença
      </h2>
      {!data ? (
        <p>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Sem dado.</span> Ainda não está no Cobra: a
          presença dos deputados distritais não é coletada.
        </p>
      ) : data.years.length ? (
        <>
          <p className={styles.note}>
            {senate
              ? "Comparecimento às votações nominais do Plenário, como o Senado registra. O Senado não publica a presença por sessão."
              : "Presença registrada nas sessões deliberativas do Plenário realizadas durante o mandato. Períodos de licença não são descontados."}{" "}
            A mediana da casa serve de referência.
          </p>
          <ul className={styles.list}>
            {data.years.map((y) => (
              <li key={y.year} data-testid={`presenca-${y.year}`}>
                <strong>{y.year}</strong>:{" "}
                {senate
                  ? `compareceu a ${formatInteger(y.present)} de ${formatInteger(y.total)} votações nominais do Plenário`
                  : `presente em ${formatInteger(y.present)} de ${formatInteger(y.total)} sessões deliberativas do Plenário`}{" "}
                ({percent(y.total ? y.present / y.total : 0)}).
                {y.median !== null ? (
                  <span className={styles.note}>
                    {" "}
                    Mediana dos {senate ? "senadores" : "deputados"}:{" "}
                    {percent(y.median)}.
                  </span>
                ) : null}
                {y.absences.length ? (
                  <span className={styles.note}>
                    {" "}
                    Ausências:{" "}
                    {y.absences
                      .map((a) => `${a.reason}: ${formatInteger(a.count)}`)
                      .join("; ")}
                    .
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          O Cobra não tem registros de presença deste parlamentar desde 2023.
        </p>
      )}
      {data ? (
        <p className={styles.source}>
          Fonte:{" "}
          {senate
            ? "Senado Federal, votações"
            : "Câmara dos Deputados, presença em eventos"}
          {data.collectedAt
            ? `, dados coletados pelo Cobra em ${formatDate(data.collectedAt)}`
            : ""}
          .
        </p>
      ) : null}
    </Card>
  );
}

const EXPENSES_PAGE: Partial<Record<HouseSlug, (id: string) => string>> = {
  camara: (id) => `https://www.camara.leg.br/deputados/${id}`,
  senado: (id) => `https://www6g.senado.leg.br/transparencia/sen/${id}/`,
};

export function Expenses({
  data,
  house,
  externalId,
}: {
  data: ExpensesData;
  house: HouseSlug | undefined;
  externalId: string | undefined;
}) {
  const official =
    house && externalId ? EXPENSES_PAGE[house]?.(externalId) : undefined;
  return (
    <Card aria-labelledby="gastos" data-testid="gastos">
      <h2 id="gastos" className={styles.h2}>
        Gastos da cota parlamentar
      </h2>
      {house === "cldf" ? (
        <p>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Sem dado.</span> Ainda não está no Cobra: os
          gastos dos deputados distritais não são coletados.
        </p>
      ) : data.years.length ? (
        <>
          <p className={styles.note}>
            Despesas reembolsadas pela cota para o exercício do mandato, como a
            casa informa, nos anos mais recentes. Fornecedores pessoas físicas
            não são identificados.
          </p>
          {data.years.map((y) => (
            <section key={y.year} aria-labelledby={`gastos-${y.year}`}>
              <h3 id={`gastos-${y.year}`} className={styles.h3}>
                {y.year}: {formatBRLCompact(y.total)}
              </h3>
              <ul className={styles.list}>
                {y.byCategory.map((c) => (
                  <li key={c.category}>
                    {c.category}: {formatBRLCompact(c.total)}
                  </li>
                ))}
              </ul>
              {y.hasRefunds ? (
                <p className={styles.note}>
                  Inclui estornos informados pela casa.
                </p>
              ) : null}
            </section>
          ))}
        </>
      ) : (
        <p>O Cobra não tem despesas da cota deste parlamentar desde 2023.</p>
      )}
      {house !== "cldf" ? (
        <p className={styles.source}>
          Fonte:{" "}
          {house === "senado" ? "Senado Federal" : "Câmara dos Deputados"}, cota
          parlamentar
          {data.collectedAt
            ? `, dados coletados pelo Cobra em ${formatDate(data.collectedAt)}`
            : ""}
          .{" "}
          {official ? (
            <a href={official} rel="noopener noreferrer">
              Ver os gastos no site oficial
            </a>
          ) : null}
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

export function Receipts({ data }: { data: ReceiptsData }) {
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

export function RelatedList({
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

export function questions(
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

export function structured(
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
