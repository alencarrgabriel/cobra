import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { Card } from "@/components/Card/Card";
import { PlaceSearch } from "@/components/PlaceSearch/PlaceSearch";
import { choosePlaces } from "@/lib/places/queries";
import type { Place } from "@/lib/places/resolve";

import styles from "./representantes.module.css";

export const metadata: Metadata = {
  title: "Seus representantes",
  description:
    "Informe o CEP, a cidade ou a UF e veja quem representa você no Senado, na Câmara e, no DF, na Câmara Legislativa.",
};

const MESSAGES: Record<string, string> = {
  "nao-encontrado":
    "Não encontramos esse lugar. Digite um CEP com 8 números, o nome da cidade ou a sigla da UF (por exemplo, DF).",
  indisponivel:
    "A busca está indisponível no momento. Tente de novo em alguns minutos.",
};

export default function SearchPage({
  searchParams,
}: PageProps<"/representantes">) {
  return (
    <main className={`${styles.page} gutter`}>
      <header className={styles.header}>
        <p className="eyebrow">Seus representantes</p>
        <h1 className={`display ${styles.title}`}>Quem representa você?</h1>
        <PlaceSearch />
      </header>
      <Suspense fallback={null}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error =
    typeof params.erro === "string" ? MESSAGES[params.erro] : undefined;
  const query =
    typeof params.escolher === "string" ? params.escolher.slice(0, 120) : "";
  if (error) {
    return (
      <p role="alert" className={styles.alert} data-testid="erro-busca">
        {error}
      </p>
    );
  }
  if (!query) return null;
  let places: Place[];
  try {
    places = await choosePlaces(query);
  } catch (e) {
    if (isDataUnavailable(e)) return <DataUnavailable />;
    throw e;
  }
  if (places.length === 0) {
    return (
      <p role="alert" className={styles.alert} data-testid="erro-busca">
        {MESSAGES["nao-encontrado"]}
      </p>
    );
  }
  return (
    <Card aria-labelledby="escolha">
      <h2 id="escolha" className={styles.h2}>
        Qual destas cidades?
      </h2>
      <ul className={styles.choices}>
        {places.map((p) => (
          <li key={p.code}>
            <Link href={`/representantes/${p.code}`}>
              {p.name} ({p.uf})
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
