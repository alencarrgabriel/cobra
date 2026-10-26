import type { Metadata } from "next";

import { Button } from "@/components/Button/Button";
import { Card } from "@/components/Card/Card";
import { FilterChip } from "@/components/FilterChip/FilterChip";
import { Kpi } from "@/components/Kpi/Kpi";
import { PartyBadge } from "@/components/PartyBadge/PartyBadge";
import { Tabs } from "@/components/Tabs/Tabs";
import { VoteBadge, VoteSplitBar } from "@/components/Vote/Vote";

import styles from "./design.module.css";
import { DesignDemos } from "./DesignDemos";
import { FAKE_PARTIES } from "./fake-data";

export const metadata: Metadata = {
  title: "Catálogo de componentes",
  robots: { index: false, follow: false },
};

const TOKENS = [
  ["--bg", "Fundo"],
  ["--surface", "Superfície"],
  ["--surface-2", "Superfície 2"],
  ["--line", "Linha"],
  ["--fg", "Texto"],
  ["--muted", "Texto secundário"],
  ["--accent", "Destaque"],
  ["--vote-yes", "Voto Sim"],
  ["--vote-no", "Voto Não"],
  ["--vote-other", "Outros votos"],
  ["--work-done", "Obra concluída"],
  ["--work-exec", "Obra em execução"],
  ["--work-stop", "Obra paralisada"],
  ["--work-idle", "Obra não iniciada"],
] as const;

export default function DesignPage() {
  return (
    <main className={`${styles.page} gutter`}>
      <div className={styles.intro}>
        <p className="eyebrow">Design system do Cobra</p>
        <h1 className={`display ${styles.h1}`}>Catálogo de componentes</h1>
        <p className={styles.notice} role="note">
          <strong>Dados fictícios.</strong> Nomes, partidos, cores de partido e
          números desta página são exemplos inventados para revisar o visual.
        </p>
      </div>

      <Card aria-labelledby="cores">
        <h2 id="cores" className={styles.h2}>
          Cores
        </h2>
        <ul className={styles.swatches}>
          {TOKENS.map(([token, label]) => (
            <li key={token}>
              <span
                className={styles.swatch}
                style={{ background: `var(${token})` }}
              />
              <span>
                {label}
                <br />
                <code>{token}</code>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card aria-labelledby="tipografia">
        <h2 id="tipografia" className={styles.h2}>
          Tipografia
        </h2>
        <p className={`display ${styles.sample}`}>
          Câmara aprova limite maior de faturamento para microempreendedor
        </p>
        <p>
          Texto de interface em Onest, com números tabulares: 312 Sim · 141 Não
          · R$ 1.234,56.
        </p>
        <p className="eyebrow">Rótulo em caixa alta</p>
      </Card>

      <Card aria-labelledby="botoes">
        <h2 id="botoes" className={styles.h2}>
          Botões e filtros
        </h2>
        <div className={styles.row}>
          <Button variant="primary">Ver meus representantes</Button>
          <Button>Trocar local</Button>
          <Button variant="whatsapp">Enviar no WhatsApp</Button>
          <Button disabled>Indisponível</Button>
        </div>
        <div
          className={styles.row}
          role="group"
          aria-label="Situação (exemplo)"
        >
          <FilterChip selected>Todas</FilterChip>
          <FilterChip selected={false}>Em execução</FilterChip>
          <FilterChip selected={false}>Paralisadas</FilterChip>
        </div>
      </Card>

      <Card aria-labelledby="abas">
        <h2 id="abas" className={styles.h2}>
          Abas
        </h2>
        <Tabs
          label="Seções do perfil (exemplo)"
          tabs={[
            {
              id: "votos",
              label: "Como votou",
              content: <p>Lista de votos do exemplo.</p>,
            },
            {
              id: "projetos",
              label: "Projetos",
              content: <p>Lista de projetos do exemplo.</p>,
            },
            {
              id: "obras",
              label: "Emendas e obras",
              badge: "fase 2",
              content: <p>Obras do exemplo.</p>,
            },
          ]}
        />
      </Card>

      <Card aria-labelledby="numeros">
        <h2 id="numeros" className={styles.h2}>
          Números com referência
        </h2>
        <div className={styles.kpis}>
          <Kpi
            value="92"
            unit="%"
            label="presença nas votações do plenário"
            share={0.92}
            reference={{ label: "mediana da casa: 81%", position: 0.81 }}
            source="exemplo fictício"
          />
          <Kpi
            value="R$ 230 mil"
            label="gastos da cota em 2026"
            share={0.5}
            reference={{ label: "50% do limite anual" }}
            source="exemplo fictício"
          />
          <Kpi
            value="R$ 2 mi"
            label="patrimônio declarado em 2026"
            reference={{ label: "R$ 1,4 mi em 2018" }}
            source="exemplo fictício"
          />
        </div>
      </Card>

      <Card aria-labelledby="votos">
        <h2 id="votos" className={styles.h2}>
          Votos
        </h2>
        <div className={styles.row}>
          <VoteBadge option="yes" />
          <VoteBadge option="no" />
          <VoteBadge option="abstention" />
          <VoteBadge option="obstruction" />
          <VoteBadge option="absent" />
        </div>
        <VoteSplitBar yes={312} no={141} other={9} size="lg" />
      </Card>

      <Card aria-labelledby="partidos">
        <h2 id="partidos" className={styles.h2}>
          Selo de partido
        </h2>
        <div className={styles.row}>
          {Object.values(FAKE_PARTIES).map((p) => (
            <PartyBadge key={p.acronym} {...p} />
          ))}
        </div>
        <p className={styles.hint}>
          Mesma forma e tamanho para todo partido; a cor do texto se ajusta para
          manter o contraste.
        </p>
      </Card>

      <Card aria-labelledby="representantes">
        <h2 id="representantes" className={styles.h2}>
          Card de representante, painel e aviso
        </h2>
        <p className={styles.hint}>
          Toque num card para abrir o painel (gaveta no celular). Esc fecha.
        </p>
        <DesignDemos />
      </Card>
    </main>
  );
}
