import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { Card } from "@/components/Card/Card";
import { WorkStatus } from "@/components/WorkStatus/WorkStatus";
import {
  type Excerpt as Segments,
  excerpts,
  findMatches,
  opening,
  searchTerms,
} from "@/lib/plans/excerpt";
import { officeTitle, ticket } from "@/lib/plans/labels";
import {
  type AreaWork,
  getAreaWorks,
  getPlan,
  type Plan,
  type PlanTheme,
  searchPages,
} from "@/lib/plans/queries";
import { slugify } from "@/lib/works/filters";
import { formatDate, formatInteger } from "@/lib/works/format";

import { Excerpt } from "../Excerpt";
import styles from "../planos.module.css";

type Search = Record<string, string | string[] | undefined>;

const MAX_QUERY = 80;

export async function generateMetadata({
  params,
}: PageProps<"/planos/[plano]">): Promise<Metadata> {
  let plan: Plan | null = null;
  try {
    plan = await getPlan((await params).plano);
  } catch (error) {
    if (!isDataUnavailable(error)) throw error;
  }
  if (!plan) return { title: "Plano de governo" };
  const title = `Plano de governo: ${officeTitle(plan)} (${plan.year})`;
  const description = `Plano registrado no TSE pela chapa ${ticket(plan)}, por tema, com trechos literais e a página do PDF oficial.`;
  return {
    title,
    description,
    alternates: { canonical: `/planos/${plan.slug}` },
    openGraph: { title, description, url: `/planos/${plan.slug}` },
  };
}

export default function PlanPage({
  params,
  searchParams,
}: PageProps<"/planos/[plano]">) {
  return (
    <main className={`${styles.page} gutter`}>
      <p>
        <Link href="/planos">← Planos de governo</Link>
      </p>
      <Suspense fallback={<p className={styles.note}>Carregando plano…</p>}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const first = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

async function Content({
  params,
  searchParams,
}: {
  params: Promise<{ plano: string }>;
  searchParams: Promise<Search>;
}) {
  const { plano } = await params;
  const query = await searchParams;
  // Work statuses depend on today's date: rendered per request.
  await connection();
  let plan: Plan | null;
  try {
    plan = await getPlan(plano);
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  if (!plan) return <DataUnavailable />;
  const q = (first(query.q) ?? "").trim().slice(0, MAX_QUERY);
  const theme = plan.themes.find((t) => t.slug === first(query.tema));
  const base = `/planos/${plan.slug}`;
  const pdf = `${base}/pdf`;
  return (
    <>
      <header className={styles.header}>
        <p className="eyebrow">Plano de governo · Eleição de {plan.year}</p>
        <h1 className={`display ${styles.title}`}>{officeTitle(plan)}</h1>
        <p className={styles.lead}>
          Plano registrado no TSE pela chapa eleita: {ticket(plan)}.
        </p>
        <p>
          <a href={pdf}>
            Abrir o PDF oficial ({formatInteger(plan.pages)} páginas)
          </a>
        </p>
        <p className={styles.source}>
          Fonte: Tribunal Superior Eleitoral (TSE)
          {plan.sourceUrl ? (
            <>
              , <a href={plan.sourceUrl}>arquivo de origem</a>
            </>
          ) : null}
          . Coletado pelo Cobra em {formatDate(plan.collectedAt)}. SHA-256 do
          PDF: <span className={styles.hash}>{plan.sha256}</span>.
        </p>
      </header>

      <form action={base} method="get" role="search" className={styles.search}>
        <label>
          Buscar uma palavra no plano
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={MAX_QUERY}
          />
        </label>
        <button type="submit" className={styles.chip}>
          Buscar
        </button>
      </form>

      <nav aria-label="Temas do plano">
        <p className={styles.note}>Temas, em ordem alfabética:</p>
        <ul className={styles.chips}>
          {plan.themes.map((t) => (
            <li key={t.slug}>
              <Link
                href={`${base}?tema=${t.slug}`}
                className={styles.chip}
                aria-current={t.slug === theme?.slug ? "true" : undefined}
              >
                {t.label} ·{" "}
                {t.pages === 1
                  ? "1 página"
                  : `${formatInteger(t.pages)} páginas`}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {q ? (
        <Results plan={plan} q={q} pdf={pdf} />
      ) : theme ? (
        <div className={styles.columns}>
          <ThemePages plan={plan} theme={theme} pdf={pdf} />
          <AreaWorks theme={theme} president={plan.office === "presidente"} />
        </div>
      ) : (
        <Card>
          <p>
            Escolha um tema ou busque uma palavra. Os temas são marcados por
            palavras fixas, sem IA (
            <Link href="/metodologia#temas">veja a lista</Link>), e o texto
            aparece como está no PDF, com o link para a página.
          </p>
        </Card>
      )}
    </>
  );
}

type Hit = { page: number; excerpts: Segments[] };

function PageHits({ hits, pdf }: { hits: Hit[]; pdf: string }) {
  return (
    <ol className={styles.list} data-testid="trechos">
      {hits.map((h) => (
        <li key={h.page}>
          <a href={`${pdf}#page=${h.page}`}>Página {h.page}</a>
          {h.excerpts.map((e, i) => (
            <Excerpt key={i} segments={e} />
          ))}
        </li>
      ))}
    </ol>
  );
}

function ThemePages({
  plan,
  theme,
  pdf,
}: {
  plan: Plan;
  theme: PlanTheme;
  pdf: string;
}) {
  const hits: Hit[] = plan.pageTexts
    .filter((p) => p.themes.includes(theme.slug))
    .map((p) => {
      const found = excerpts(
        p.text,
        findMatches(p.text, theme.keywords, "word"),
      );
      return {
        page: p.page,
        excerpts: found.length ? found : [opening(p.text)],
      };
    });
  return (
    <Card aria-labelledby="tema">
      <h2 id="tema" className={styles.h2}>
        {theme.label}
      </h2>
      <p className={styles.note} data-testid="palavras-do-tema">
        Palavras usadas para marcar o tema: {theme.keywords.join(", ")}. Uma
        página entra no tema quando elas aparecem ao menos duas vezes.
      </p>
      {hits.length ? (
        <PageHits hits={hits} pdf={pdf} />
      ) : (
        <p>Este tema não aparece no plano.</p>
      )}
    </Card>
  );
}

async function AreaWorks({
  theme,
  president,
}: {
  theme: PlanTheme;
  president: boolean;
}) {
  let data: { works: AreaWork[]; total: number };
  try {
    data = await getAreaWorks(theme.workTypes);
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  return (
    <Card aria-labelledby="obras-da-area" data-testid="obras-da-area">
      <h2 id="obras-da-area" className={styles.h2}>
        Obras com recurso federal da mesma área no DF
      </h2>
      <p>
        O Cobra mostra as obras da mesma área lado a lado com o plano. Não
        afirma se uma promessa foi cumprida.
        {president
          ? " O plano é nacional; as obras são do DF, a localidade do piloto."
          : ""}
      </p>
      {theme.workTypes.length === 0 ? (
        <p>Nenhuma área de obra do Obrasgov.br corresponde a este tema.</p>
      ) : (
        <>
          <p className={styles.note}>
            Áreas do Obrasgov.br: {theme.workTypes.join(", ")}.{" "}
            {data.total === 1 ? "1 obra" : `${formatInteger(data.total)} obras`}{" "}
            no DF, em ordem alfabética.
          </p>
          {data.works.length ? (
            <ul className={styles.list}>
              {data.works.map((w) => (
                <li key={w.code}>
                  <Link href={`/obras/${encodeURIComponent(w.code)}`}>
                    {w.name}
                  </Link>{" "}
                  <WorkStatus status={w.status} />
                </li>
              ))}
            </ul>
          ) : null}
          <ul className={styles.chips}>
            {theme.workTypes.map((t) => (
              <li key={t}>
                <Link
                  href={`/obras?area=${slugify(t)}`}
                  className={styles.chip}
                >
                  Ver todas as obras de {t}
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.source}>Fonte: Obrasgov.br.</p>
        </>
      )}
    </Card>
  );
}

async function Results({
  plan,
  q,
  pdf,
}: {
  plan: Plan;
  q: string;
  pdf: string;
}) {
  let dictionary: number[];
  try {
    dictionary = await searchPages(plan.id, q);
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  const terms = searchTerms(q);
  const hits: Hit[] = plan.pageTexts.flatMap((p) => {
    const found = excerpts(p.text, findMatches(p.text, terms, "prefix"));
    if (found.length) return [{ page: p.page, excerpts: found }];
    return dictionary.includes(p.page)
      ? [{ page: p.page, excerpts: [opening(p.text)] }]
      : [];
  });
  return (
    <Card aria-labelledby="busca">
      <h2 id="busca" className={styles.h2}>
        Busca por “{q}”
      </h2>
      {hits.length ? (
        <>
          <p data-testid="total-busca">
            {hits.length === 1
              ? "Aparece em 1 página."
              : `Aparece em ${formatInteger(hits.length)} páginas.`}
          </p>
          <PageHits hits={hits} pdf={pdf} />
        </>
      ) : (
        <p data-testid="total-busca">Essa palavra não aparece no plano.</p>
      )}
    </Card>
  );
}
