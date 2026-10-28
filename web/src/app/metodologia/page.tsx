import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { isDataUnavailable } from "@/app/obras/DataUnavailable";
import { getMethodology, type Methodology } from "@/lib/methodology/queries";
import { formatDate } from "@/lib/works/format";

import styles from "./metodologia.module.css";

export const metadata: Metadata = {
  title: "Metodologia",
  description:
    "De onde vêm os dados do Cobra, com que frequência são atualizados, o que torna uma votação relevante e as regras editoriais.",
};

// Public methodology (DDR RF-65, change metodologia). Numbers here are the same as in the
// code: core.vote_relevance (§9.2), core.plan_themes and the collectors.

type Source = { key: string; name: string; url: string; uses: string };

/** Alphabetical, as every list on the site (§9.1, neutral order). */
const SOURCES: Source[] = [
  {
    key: "camara",
    name: "Câmara dos Deputados",
    url: "https://dadosabertos.camara.leg.br",
    uses: "deputados federais, votações do Plenário, votos e orientações, cota parlamentar e presença nas sessões deliberativas",
  },
  {
    key: "cldf",
    name: "Câmara Legislativa do Distrito Federal",
    url: "https://www.cl.df.gov.br",
    uses: "deputados distritais, lidos do site oficial (a CLDF não tem API de deputados)",
  },
  {
    key: "ibge",
    name: "IBGE",
    url: "https://servicodados.ibge.gov.br/api/docs/localidades",
    uses: "municípios e estados, para a busca por cidade",
  },
  {
    key: "obrasgov",
    name: "Obrasgov.br",
    url: "https://api-publica.obrasgov.gestao.gov.br/obras/docs",
    uses: "obras com recurso federal no DF: situação, valores, execução física, paralisações e empenhos",
  },
  {
    key: "transparencia",
    name: "Portal da Transparência (CGU)",
    url: "https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares",
    uses: "emendas parlamentares com destino ao DF e seus autores",
  },
  {
    key: "senado",
    name: "Senado Federal",
    url: "https://legis.senado.leg.br/dadosabertos",
    uses: "senadores, votações do Plenário, votos e orientações, e cota parlamentar",
  },
  {
    key: "tse",
    name: "Tribunal Superior Eleitoral (TSE)",
    url: "https://dadosabertos.tse.jus.br",
    uses: "candidaturas e votos desde 1994, bens declarados, receitas de campanha e planos de governo",
  },
];

export default function MethodologyPage() {
  return (
    <main className={`${styles.page} gutter`}>
      <header className={styles.header}>
        <p className="eyebrow">Como o Cobra funciona</p>
        <h1 className={`display ${styles.title}`}>Metodologia</h1>
        <p className={styles.lead}>
          Todo dado do Cobra vem de uma fonte oficial, é copiado para o banco do
          Cobra e aparece com a fonte e a data. O site não dá nota, não faz
          ranking e não consulta o governo em tempo real.
        </p>
        <nav aria-label="Seções da metodologia">
          <ul className={styles.toc}>
            <li>
              <a href="#fontes">Fontes</a>
            </li>
            <li>
              <a href="#atualizacao">Atualização</a>
            </li>
            <li>
              <a href="#relevancia">Votação relevante</a>
            </li>
            <li>
              <a href="#regras">Regras editoriais</a>
            </li>
            <li>
              <a href="#temas">Temas dos planos</a>
            </li>
            <li>
              <a href="#emendas">Obras e emendas</a>
            </li>
          </ul>
        </nav>
      </header>

      <section aria-labelledby="fontes" className={styles.section}>
        <h2 id="fontes" className={styles.h2}>
          Fontes
        </h2>
        <p>
          Só fontes públicas e oficiais. Cada dado guarda a fonte, o
          identificador original e a data em que o Cobra o coletou.
        </p>
        <Suspense fallback={<Sources data={null} />}>
          <SourcesWithDates />
        </Suspense>
      </section>

      <section aria-labelledby="atualizacao" className={styles.section}>
        <h2 id="atualizacao" className={styles.h2}>
          Atualização
        </h2>
        <p>As metas de atualização do Cobra são:</p>
        <ul>
          <li>
            votações e proposições federais: até 6 horas depois de publicadas na
            fonte;
          </li>
          <li>gastos, presença, obras e emendas: todo dia;</li>
          <li>dados do TSE: a cada nova publicação do tribunal.</li>
        </ul>
        <p>
          A data que vale é a que aparece junto de cada dado, e a última coleta
          de cada fonte está na lista acima. Coletamos em horários espaçados e
          dentro dos limites que cada fonte pede.
        </p>
      </section>

      <section aria-labelledby="relevancia" className={styles.section}>
        <h2 id="relevancia" className={styles.h2}>
          Votação relevante
        </h2>
        <p>
          Uma votação nominal entra no feed quando atende a pelo menos um
          critério objetivo, e o critério aparece na página da votação:
        </p>
        <ul data-testid="criterios">
          <li>
            <strong>Divergência entre lideranças</strong>: o Governo e a
            Oposição orientaram posições diferentes entre “sim”, “não” e
            “obstrução”.
          </li>
          <li>
            <strong>Placar disputado</strong>: a diferença entre “sim” e “não”
            foi menor que 20% dos votantes.
          </li>
          <li>
            <strong>Tipo de matéria</strong>: proposta de emenda à Constituição
            (PEC), medida provisória (MPV), projeto de lei complementar (PLP),
            projeto de lei do Congresso, como o orçamento (PLN), ou veto (VET).
          </li>
          <li>
            <strong>Curadoria editorial</strong>: inclusão manual pela equipe,
            com a justificativa publicada na votação e registrada.
          </li>
        </ul>
        <p>
          Votações simbólicas não têm registro de voto individual: aparecem como
          evento, sem atribuir voto a ninguém. Nas votações secretas do Senado,
          só os totais são públicos. Quando os votos individuais informados pela
          casa não somam o placar oficial, mostramos só o placar.
        </p>
      </section>

      <section aria-labelledby="regras" className={styles.section}>
        <h2 id="regras" className={styles.h2}>
          Regras editoriais
        </h2>
        <ul>
          <li>Fato, fonte e data em tudo.</li>
          <li>
            Sem adjetivos de valor: nada de “polêmico”, “absurdo” ou “importante
            conquista”.
          </li>
          <li>
            Os dois lados: o resumo diz o que muda e, quando houver, os
            argumentos a favor e contra, atribuídos a quem os defende.
          </li>
          <li>
            Mesmo tratamento para todos os partidos e políticos: mesmos campos,
            mesma ordem, mesmo destaque. Cor e sigla do partido identificam; não
            julgam.
          </li>
          <li>
            Ordem neutra: listas em ordem alfabética ou por critério declarado,
            nunca por “desempenho”.
          </li>
          <li>
            Resumos de votações podem ser rascunhados com IA, mas só são
            publicados depois de revisados e aprovados por uma pessoa da equipe,
            com registro de quem aprovou e quando. O resumo diz quando houve
            rascunho com IA.
          </li>
          <li>
            Dado indisponível aparece como “—”, nunca como zero, com o motivo.
          </li>
          <li>
            Presença vem com uma referência (a mediana da casa), sem rótulo de
            bom ou ruim.
          </li>
          <li>Erros são corrigidos com registro público do que mudou.</li>
        </ul>
      </section>

      <section aria-labelledby="temas" className={styles.section}>
        <h2 id="temas" className={styles.h2}>
          Temas dos planos de governo
        </h2>
        <p>
          Os temas de cada página de um plano de governo são marcados por uma
          regra fixa e igual para todos os planos: uma página recebe o tema
          quando as palavras dele aparecem pelo menos duas vezes nela, sem
          diferenciar acentos nem maiúsculas. Nenhuma pessoa nem IA escolhe os
          temas.
        </p>
        <Suspense fallback={<p className={styles.note}>Carregando temas…</p>}>
          <Themes />
        </Suspense>
      </section>

      <section aria-labelledby="emendas" className={styles.section}>
        <h2 id="emendas" className={styles.h2}>
          Obras e emendas
        </h2>
        <p>
          Uma obra é ligada a uma emenda só quando o empenho da obra, informado
          no Obrasgov.br, identifica uma emenda do Portal da Transparência. É o
          grau de confiança <strong>direto</strong>, o único usado hoje.
          Ligações por convênio ou por município ainda não são feitas, para não
          sugerir vínculo que a fonte não confirma.
        </p>
        <p>
          O autor da emenda é ligado ao político quando o nome bate com o nome
          parlamentar de exatamente um deputado federal ou senador. Emendas de
          bancada, comissão ou relator ficam sem político.
        </p>
      </section>

      <p className={styles.note}>
        O código do Cobra é aberto. Veja também como tratamos seus dados na{" "}
        <Link href="/privacidade">página de privacidade</Link>.
      </p>
    </main>
  );
}

async function load(): Promise<Methodology | null> {
  // Read per request (cached for hours), not baked into the build: a prerendered shell
  // waiting on the cache made link prefetches hang.
  await connection();
  try {
    return await getMethodology();
  } catch (error) {
    if (isDataUnavailable(error)) return null;
    throw error;
  }
}

async function SourcesWithDates() {
  return <Sources data={await load()} />;
}

function Sources({ data }: { data: Methodology | null }) {
  return (
    <ul className={styles.sources} data-testid="fontes">
      {SOURCES.map((s) => {
        const at = data?.lastCollected[s.key];
        return (
          <li key={s.key} data-testid={`fonte-${s.key}`}>
            <a href={s.url} rel="noopener noreferrer">
              {s.name}
            </a>
            : {s.uses}.{" "}
            <span className={styles.note}>
              Última coleta:{" "}
              {at ? (
                formatDate(at)
              ) : (
                <span title="Ainda não coletado neste ambiente, ou o banco está fora do ar">
                  — (sem coleta registrada)
                </span>
              )}
              .
            </span>
          </li>
        );
      })}
    </ul>
  );
}

async function Themes() {
  const data = await load();
  if (!data) {
    return (
      <p>
        — A lista de palavras está fora do ar no momento; tente de novo mais
        tarde.
      </p>
    );
  }
  return (
    <dl className={styles.themes} data-testid="temas">
      {data.themes.map((t) => (
        <div key={t.slug}>
          <dt>{t.label}</dt>
          <dd>{t.keywords.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}
