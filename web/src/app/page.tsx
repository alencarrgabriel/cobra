import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";

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
        <form className={styles.search} aria-describedby="busca-em-breve">
          <label htmlFor="cep" className="sr-only">
            CEP, cidade ou nome do político
          </label>
          <input
            id="cep"
            name="cep"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="CEP, cidade ou nome"
            disabled
          />
          <Button variant="primary" type="submit" disabled>
            Ver meus representantes
          </Button>
        </form>
        <p id="busca-em-breve" className={styles.hint}>
          A busca chega em breve. Vai funcionar sem cadastro: seu CEP vira só o
          nome da cidade e é descartado.
        </p>
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
