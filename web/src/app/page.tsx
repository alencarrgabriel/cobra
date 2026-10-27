import { Card } from "@/components/Card/Card";
import { PlaceSearch } from "@/components/PlaceSearch/PlaceSearch";
import { RememberedPlace } from "@/components/RememberedPlace/RememberedPlace";

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
