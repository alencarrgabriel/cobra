import { connection } from "next/server";
import { Suspense } from "react";

import { isDataUnavailable } from "@/app/obras/DataUnavailable";
import { BrazilMap } from "@/components/BrazilMap/BrazilMap";
import { Card } from "@/components/Card/Card";
import { PlaceSearch } from "@/components/PlaceSearch/PlaceSearch";
import { RememberedPlace } from "@/components/RememberedPlace/RememberedPlace";
import { CARD_SIZES } from "@/lib/cards/formats";
import { cardPath } from "@/lib/cards/share";
import { DF_UF } from "@/lib/geo/cep";
import { getLatestWorkCode, PILOT_UF } from "@/lib/works/queries";

import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={`${styles.page} gutter`}>
      <Card className={styles.hero} aria-labelledby="titulo">
        <p className="eyebrow">Acompanhe o mandato, não a campanha</p>
        <h1 id="titulo" className={`display ${styles.title}`}>
          O que fazem os políticos que <em>representam você</em>
        </h1>
        <p className={styles.lead}>
          Veja o que fazem os políticos que representam você: como votam, o que
          propõem e quanto gastam. Só fatos, com fonte oficial.
        </p>
        <PlaceSearch />
        <RememberedPlace />
      </Card>

      <Card aria-labelledby="mapa">
        <h2 id="mapa" className={styles.h2}>
          Explore pelo mapa
        </h2>
        <p className={styles.explain}>
          Toque num estado para ver a bancada dele no Congresso.
        </p>
        <BrazilMap />
      </Card>

      <Card aria-labelledby="exemplos">
        <h2 id="exemplos" className={styles.h2}>
          Cards para compartilhar
        </h2>
        <p className={styles.explain}>
          Cada página do Cobra vira uma imagem para enviar no WhatsApp ou postar
          nas redes, sempre com a fonte e a data. Exemplos:
        </p>
        <Suspense fallback={null}>
          <Examples />
        </Suspense>
      </Card>

      <Card aria-labelledby="como-funciona">
        <h2 id="como-funciona" className={styles.h2}>
          Quem representa você
        </h2>
        <p className={styles.explain}>
          Deputados federais e senadores são eleitos pelo estado inteiro, não
          por bairro. Por isso todos os eleitores de um estado têm os mesmos
          representantes no Congresso. No Distrito Federal, os deputados
          distritais fazem o papel de deputado estadual e de vereador ao mesmo
          tempo.
        </p>
      </Card>
    </main>
  );
}

/** RF-69, with an objective choice and no politician picked (mapa-do-brasil D4). */
async function Examples() {
  // Read per request (the query is cached), so a build never freezes the example.
  await connection();
  let work: string | null = null;
  try {
    work = await getLatestWorkCode(PILOT_UF);
  } catch (error) {
    if (!isDataUnavailable(error)) throw error;
  }
  const { width, height } = CARD_SIZES.feed;
  const examples = [
    {
      src: cardPath("representantes", DF_UF, "feed"),
      href: `/representantes/${DF_UF}`,
      alt: "Exemplo de card: representantes do Distrito Federal",
      caption: "Os representantes do Distrito Federal.",
    },
    ...(work
      ? [
          {
            src: cardPath("obra", work, "feed"),
            href: `/obras/${encodeURIComponent(work)}`,
            alt: "Exemplo de card: uma obra do Distrito Federal",
            caption:
              "A obra do DF com a atualização mais recente no Obrasgov.br.",
          },
        ]
      : []),
  ];
  return (
    <ul className={styles.examples} data-testid="exemplos-de-cards">
      {examples.map((e) => (
        <li key={e.src}>
          <a href={e.href}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG, already sized */}
            <img
              src={e.src}
              alt={e.alt}
              width={width}
              height={height}
              loading="lazy"
              className={styles.example}
            />
          </a>
          <p className={styles.caption}>{e.caption}</p>
        </li>
      ))}
    </ul>
  );
}
