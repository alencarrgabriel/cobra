import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { Card } from "@/components/Card/Card";
import { PlaceSearch } from "@/components/PlaceSearch/PlaceSearch";
import { RememberPlace } from "@/components/RememberedPlace/RememberedPlace";
import { SharePanel } from "@/components/SharePanel/SharePanel";
import { UfFlag } from "@/components/UfFlag/UfFlag";
import { placeTitle } from "@/lib/cards/content";
import { shareMetadata } from "@/lib/cards/metadata";
import { DF_UF } from "@/lib/geo/cep";
import { FLAGS } from "@/lib/geo/flags";
import { getPlace, type PlaceDetail } from "@/lib/places/queries";
import {
  getHouseUpdates,
  getRepresentatives,
  type House,
  type HouseUpdate,
  type Representative,
} from "@/lib/representatives/queries";
import { formatDate } from "@/lib/works/format";

import styles from "../representantes.module.css";
import { RepresentativesGrid } from "./RepresentativesGrid";

const DESCRIPTION =
  "Senadores, deputados federais e, no DF, deputados distritais do lugar.";

export async function generateMetadata({
  params,
}: PageProps<"/representantes/[codigo]">): Promise<Metadata> {
  const { codigo } = await params;
  let place: PlaceDetail | null = null;
  try {
    place = await getPlace(codigo);
  } catch (error) {
    if (!isDataUnavailable(error)) throw error;
  }
  if (!place) return { title: "Seus representantes", description: DESCRIPTION };
  return shareMetadata({
    title: placeTitle(place),
    description: `${placeTitle(place)} no Senado, na Câmara${place.ufCode === DF_UF ? " e na Câmara Legislativa" : ""}, com fonte oficial.`,
    // The IBGE code, never the CEP (RF-60).
    path: `/representantes/${place.code}`,
    card: ["representantes", place.code, "link"],
  });
}

const HOUSE_NAMES: Record<House, string> = {
  senado: "Senado Federal",
  camara: "Câmara dos Deputados",
  cldf: "Câmara Legislativa do DF",
};

type Params = { codigo: string };
type Search = Record<string, string | string[] | undefined>;

export default function PlacePage({
  params,
  searchParams,
}: PageProps<"/representantes/[codigo]">) {
  return (
    <main className={`${styles.page} gutter`}>
      <Suspense
        fallback={<p className={styles.note}>Carregando representantes…</p>}
      >
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** "do Distrito Federal", "de São Paulo", "da Bahia". */
const ufOf = (place: PlaceDetail) =>
  `${FLAGS[place.uf]?.preposition ?? "de"} ${place.ufName}`;

const label = (place: PlaceDetail) =>
  place.kind === "municipality" ? `${place.name} (${place.uf})` : place.name;

async function load(code: string) {
  const place = await getPlace(code);
  if (!place) return null;
  const [people, updates] = await Promise.all([
    getRepresentatives(place.ufCode),
    getHouseUpdates(),
  ]);
  return { place, people, updates };
}

async function Content({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { codigo } = await params;
  const query = await searchParams;
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(codigo);
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  if (!data) return <DataUnavailable />;
  const { place, people, updates } = data;
  const parties = [
    ...new Set(people.map((p) => p.party?.acronym).filter(Boolean)),
  ].sort() as string[];
  const party =
    typeof query.partido === "string" && parties.includes(query.partido)
      ? query.partido
      : null;
  const shown = party
    ? people.filter((p) => p.party?.acronym === party)
    : people;
  const byHouse = (house: House) => shown.filter((p) => p.house === house);
  const isDf = place.ufCode === DF_UF;
  const base = `/representantes/${place.code}`;
  return (
    <>
      <RememberPlace codigo={place.code} nome={label(place)} />
      <header className={styles.header}>
        <p className={`eyebrow ${styles.placeHead}`}>
          <UfFlag uf={place.uf} size="md" />
          {place.ufName}
        </p>
        <h1 className={`display ${styles.title}`}>
          Seus representantes em {label(place)}
        </h1>
        <p className={styles.lead}>
          Deputados federais e senadores são eleitos pelo estado inteiro, não
          por bairro. Por isso todos os eleitores {ufOf(place)} têm os mesmos
          representantes no Congresso.
        </p>
        <SharePanel
          path={base}
          text={`${placeTitle(place)} no Senado, na Câmara${isDf ? " e na Câmara Legislativa" : ""}, no Cobra.`}
          card={{ kind: "representantes", id: place.code }}
        />
      </header>

      {parties.length > 1 ? (
        <nav aria-label="Filtrar por partido">
          <ul className={styles.chips}>
            <li>
              <Link
                href={base}
                className={styles.chip}
                aria-current={party === null ? "true" : undefined}
              >
                Todos
              </Link>
            </li>
            {parties.map((acronym) => (
              <li key={acronym}>
                <Link
                  href={`${base}?partido=${encodeURIComponent(acronym)}`}
                  className={styles.chip}
                  aria-current={party === acronym ? "true" : undefined}
                >
                  {acronym}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <p className={styles.note}>
        Em ordem alfabética pelo nome. Toque num card para ver o resumo.
      </p>

      <Section
        id="senado"
        title="Senadores"
        people={byHouse("senado")}
        update={updates}
        house="senado"
      >
        Cada UF elege 3 senadores, com mandato de 8 anos.
      </Section>
      <Section
        id="camara"
        title="Deputados federais"
        people={byHouse("camara")}
        update={updates}
        house="camara"
      >
        O número de deputados federais de cada UF depende da população.
      </Section>
      {isDf ? (
        <Section
          id="cldf"
          title="Deputados distritais"
          people={byHouse("cldf")}
          update={updates}
          house="cldf"
        >
          O DF não tem prefeito nem vereadores: os 24 deputados distritais fazem
          o papel de deputado estadual e de vereador ao mesmo tempo.
        </Section>
      ) : (
        <Card aria-labelledby="estaduais">
          <h2 id="estaduais" className={styles.h2}>
            Deputados estaduais e vereadores
          </h2>
          <p className={styles.note} data-testid="sem-cobertura">
            Ainda não estão no Cobra. Por enquanto mostramos os representantes
            federais {ufOf(place)}; os da sua Assembleia Legislativa e da sua
            Câmara Municipal entram depois.
          </p>
        </Card>
      )}
      <Card aria-labelledby="placar" data-testid="placar">
        <h2 id="placar" className={styles.h2}>
          Placar das votações recentes {ufOf(place)}
        </h2>
        <p>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Sem dado.</span> Ainda não está no Cobra:
          vem com a coleta das votações da Câmara e do Senado.
        </p>
      </Card>
      <Card aria-labelledby="outro-lugar">
        <h2 id="outro-lugar" className={styles.h2}>
          Ver outro lugar
        </h2>
        <PlaceSearch id="outro" />
      </Card>
    </>
  );
}

function Section({
  id,
  title,
  people,
  house,
  update,
  children,
}: {
  id: string;
  title: string;
  people: Representative[];
  house: House;
  update: HouseUpdate[];
  children: React.ReactNode;
}) {
  const collected = update.find((u) => u.house === house)?.collectedAt;
  return (
    <Card aria-labelledby={id} data-testid={`secao-${id}`}>
      <h2 id={id} className={styles.h2}>
        {title} <span className={styles.note}>({people.length})</span>
      </h2>
      <p className={styles.note}>{children}</p>
      {people.length ? (
        <RepresentativesGrid people={people} />
      ) : (
        <p className={styles.empty}>Nenhum representante com esse filtro.</p>
      )}
      <p className={styles.source}>
        Fonte: {HOUSE_NAMES[house]}
        {collected
          ? `, dados coletados pelo Cobra em ${formatDate(collected)}`
          : ""}
        .
      </p>
    </Card>
  );
}
