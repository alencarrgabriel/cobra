import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Card } from "@/components/Card/Card";
import { WorksMap } from "@/components/WorksMap/WorksMap";
import { WorkStatus } from "@/components/WorkStatus/WorkStatus";
import {
  filtersHref,
  PAGE_SIZE,
  parseFilters,
  type SearchParams,
  WORK_STATUSES,
  type WorkFilters,
} from "@/lib/works/filters";
import {
  formatBRLCompact,
  formatInteger,
  STATUS_INFO,
} from "@/lib/works/format";
import {
  getAreas,
  getDataDates,
  getPins,
  getSummary,
  getWorkList,
  PILOT_UF,
} from "@/lib/works/queries";

import { DataUnavailable, isDataUnavailable } from "./DataUnavailable";
import { FilterGroup, FilterLink } from "./Filters";
import styles from "./obras.module.css";
import { SourceNote } from "./SourceNote";

export const metadata: Metadata = {
  title: "Obras no Distrito Federal",
  description:
    "Obras com dinheiro federal no Distrito Federal: quanto custam, em que situação estão e onde ficam. Dados do Obrasgov.br.",
};

export default function WorksPage({ searchParams }: PageProps<"/obras">) {
  return (
    <main className={`${styles.page} gutter`}>
      <header className={styles.header}>
        <p className="eyebrow">Distrito Federal</p>
        <h1 className={`display ${styles.title}`}>
          Obras com dinheiro federal
        </h1>
        <p className={styles.lead}>
          Escolas, postos de saúde, vias e outras obras pagas, no todo ou em
          parte, com recursos da União. A situação de cada obra é informada
          pelos próprios gestores ao governo federal.
        </p>
      </header>
      <Suspense fallback={<p className={styles.loading}>Carregando obras…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function load(filters: WorkFilters) {
  const [summary, areas, dates] = await Promise.all([
    getSummary(PILOT_UF),
    getAreas(PILOT_UF),
    getDataDates(PILOT_UF),
  ]);
  const area = areas.find((a) => a.slug === filters.area) ?? null;
  const query = {
    uf: PILOT_UF,
    status: filters.status,
    type: area?.type ?? null,
  };
  const [list, map] = await Promise.all([
    getWorkList({ ...query, order: filters.order, page: filters.page }),
    getPins(query),
  ]);
  // An unknown area is ignored, like any invalid filter (design D3).
  const applied: WorkFilters = { ...filters, area: area?.slug ?? null };
  return { summary, areas, dates, list, map, applied };
}

async function Results({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  let data: Awaited<ReturnType<typeof load>>;
  try {
    const filters = parseFilters(await searchParams);
    // "há N meses" depends on today's date, so the results are rendered per request.
    await connection();
    data = await load(filters);
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  const { summary, areas, dates, list, map, applied } = data;
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  return (
    <>
      <Card aria-labelledby="resumo">
        <h2 id="resumo" className={styles.h2}>
          Resumo
        </h2>
        <dl className={styles.totals}>
          <div>
            <dt>Obras</dt>
            <dd data-testid="total-obras">{formatInteger(summary.total)}</dd>
          </div>
          <div>
            <dt>Valor previsto somado</dt>
            <dd data-testid="valor-previsto">
              {formatBRLCompact(summary.plannedValue)}
            </dd>
          </div>
        </dl>
        <ul className={styles.byStatus} aria-label="Obras por situação">
          {WORK_STATUSES.map((s) => (
            <li key={s} data-testid={`situacao-${s}`}>
              <WorkStatus status={s} />
              <strong>{formatInteger(summary.byStatus[s])}</strong>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          “Cadastrada” é a obra {STATUS_INFO.registered.hint}.
        </p>
        <SourceNote
          updatedAt={dates.sourceUpdatedAt}
          collectedAt={dates.collectedAt}
        />
      </Card>

      <Card aria-labelledby="filtros">
        <h2 id="filtros" className={styles.h2}>
          Filtrar
        </h2>
        <FilterGroup label="Situação">
          <FilterLink
            href={filtersHref({ ...applied, status: null, page: 1 })}
            current={applied.status === null}
          >
            Todas
          </FilterLink>
          {WORK_STATUSES.map((s) => (
            <FilterLink
              key={s}
              href={filtersHref({ ...applied, status: s, page: 1 })}
              current={applied.status === s}
            >
              {STATUS_INFO[s].label}
            </FilterLink>
          ))}
        </FilterGroup>
        <FilterGroup label="Área">
          <FilterLink
            href={filtersHref({ ...applied, area: null, page: 1 })}
            current={applied.area === null}
          >
            Todas
          </FilterLink>
          {areas.map((a) => (
            <FilterLink
              key={a.slug}
              href={filtersHref({ ...applied, area: a.slug, page: 1 })}
              current={applied.area === a.slug}
            >
              {a.type}
            </FilterLink>
          ))}
        </FilterGroup>
      </Card>

      <Card aria-labelledby="mapa">
        <h2 id="mapa" className={styles.h2}>
          Onde ficam
        </h2>
        <WorksMap pins={map.pins} withoutLocation={map.withoutLocation} />
      </Card>

      <Card aria-labelledby="lista">
        <h2 id="lista" className={styles.h2}>
          {list.total === 1
            ? "1 obra encontrada"
            : `${formatInteger(list.total)} obras encontradas`}
        </h2>
        <FilterGroup label="Ordenar por">
          <FilterLink
            href={filtersHref({ ...applied, order: "valor", page: 1 })}
            current={applied.order === "valor"}
          >
            Valor previsto
          </FilterLink>
          <FilterLink
            href={filtersHref({ ...applied, order: "nome", page: 1 })}
            current={applied.order === "nome"}
          >
            Nome
          </FilterLink>
        </FilterGroup>
        <p className={styles.note} data-testid="criterio">
          {applied.order === "nome"
            ? "Em ordem alfabética pelo nome da obra."
            : "Do maior para o menor valor previsto; obras sem valor informado ficam no fim."}
        </p>
        {list.items.length === 0 ? (
          <p>Nenhuma obra com esses filtros.</p>
        ) : (
          <ol className={styles.list} data-testid="lista-obras">
            {list.items.map((w) => (
              <li key={w.code} className={styles.item}>
                <Link
                  href={`/obras/${encodeURIComponent(w.code)}`}
                  className={styles.name}
                >
                  {w.name}
                </Link>
                <WorkStatus status={w.status} stoppedSince={w.stoppedSince} />
                <p className={styles.meta}>
                  {[
                    w.type,
                    w.plannedValue !== null
                      ? formatBRLCompact(w.plannedValue)
                      : "valor não informado",
                    w.progress !== null
                      ? `${formatInteger(w.progress)}% executado`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {w.address ? (
                  <p className={styles.address}>{w.address}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {pages > 1 ? (
          <nav aria-label="Páginas da lista" className={styles.pager}>
            {applied.page > 1 ? (
              <Link
                href={filtersHref({ ...applied, page: applied.page - 1 })}
                rel="prev"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span>
              Página {applied.page} de {pages}
            </span>
            {applied.page < pages ? (
              <Link
                href={filtersHref({ ...applied, page: applied.page + 1 })}
                rel="next"
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Card>
    </>
  );
}
