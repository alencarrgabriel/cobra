import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { FLAGS } from "@/lib/geo/flags";
import { getPlace, type PlaceDetail } from "@/lib/places/queries";
import {
  getFeed,
  getPlaceVotes,
  type RepresentativeVote,
  type VoteSummary,
} from "@/lib/votes/queries";

import { PlaceLink } from "./PlaceLink";
import styles from "./votacoes.module.css";
import { VoteCard } from "./VoteCard";

export const metadata: Metadata = {
  title: "O que aconteceu",
  description:
    "Votações relevantes da Câmara e do Senado, com o voto dos seus representantes, por critério objetivo e com fonte oficial.",
};

const HOUSES: [string | null, string][] = [
  [null, "Todas"],
  ["camara", "Câmara"],
  ["senado", "Senado"],
];

type Search = Record<string, string | string[] | undefined>;

export default function FeedPage({ searchParams }: PageProps<"/votacoes">) {
  return (
    <main className={`${styles.page} gutter`}>
      <header className={styles.header}>
        <p className="eyebrow">O que aconteceu</p>
        <h1 className={`display ${styles.title}`}>Votações</h1>
        <p className={styles.lead}>
          Votações relevantes da Câmara e do Senado, da mais recente para a mais
          antiga. Uma votação é relevante por critério objetivo: Governo e
          Oposição divergiram, o placar foi disputado ou o tipo de matéria (PEC,
          medida provisória, lei complementar, orçamento, veto).
        </p>
      </header>
      <Suspense fallback={<p className={styles.note}>Carregando votações…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const first = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

/** "do Distrito Federal", "de São Paulo (SP)". */
function ofPlace(place: PlaceDetail): string {
  if (place.kind === "municipality") return `de ${place.name} (${place.uf})`;
  return `${FLAGS[place.uf]?.preposition ?? "de"} ${place.name}`;
}

async function Feed({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const casa = first(query.casa);
  const house = casa === "camara" || casa === "senado" ? casa : null;
  const pageNumber = Math.max(
    1,
    Math.min(500, Number(first(query.pagina)) || 1),
  );
  const lugar = first(query.lugar);
  let items: VoteSummary[];
  let more: boolean;
  let place: PlaceDetail | null = null;
  let reps: RepresentativeVote[] = [];
  try {
    ({ items, more } = await getFeed(house, pageNumber));
    place =
      lugar && /^\d{2}(\d{5})?$/.test(lugar) ? await getPlace(lugar) : null;
    if (place) {
      reps = await getPlaceVotes(
        place.ufCode,
        items.filter((v) => v.kind === "votacao_relevante").map((v) => v.id),
      );
    }
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  const params = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged = { casa: house, lugar: place?.code ?? null, ...changes };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const text = next.toString();
    return text ? `/votacoes?${text}` : "/votacoes";
  };
  return (
    <>
      <nav aria-label="Filtrar por casa">
        <ul className={styles.chips}>
          {HOUSES.map(([slug, label]) => (
            <li key={label}>
              <Link
                href={params({ casa: slug, pagina: null })}
                className={styles.chip}
                aria-current={slug === house ? "true" : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {place ? (
        <p data-testid="lugar-do-feed">
          Mostrando como votaram os representantes {ofPlace(place)}.{" "}
          <Link href={params({ lugar: null, pagina: null })}>
            Ver sem lugar
          </Link>
        </p>
      ) : (
        <PlaceLink />
      )}
      <ol className={styles.list} data-testid="feed">
        {items.map((v) => (
          <li key={v.id}>
            <VoteCard
              vote={v}
              reps={place ? reps.filter((r) => r.voteId === v.id) : null}
              placeName={place ? ofPlace(place) : null}
            />
          </li>
        ))}
      </ol>
      {items.length === 0 ? <p>Nenhuma votação para mostrar.</p> : null}
      <nav aria-label="Páginas" className={styles.pager}>
        {pageNumber > 1 ? (
          <Link href={params({ pagina: String(pageNumber - 1) })}>
            ← Mais recentes
          </Link>
        ) : null}
        {more ? (
          <Link href={params({ pagina: String(pageNumber + 1) })}>
            Mais antigas →
          </Link>
        ) : null}
      </nav>
    </>
  );
}
