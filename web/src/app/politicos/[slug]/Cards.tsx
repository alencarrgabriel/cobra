import Link from "next/link";

import { Card } from "@/components/Card/Card";
import { WorkStatus } from "@/components/WorkStatus/WorkStatus";
import { FLAGS } from "@/lib/geo/flags";
import type {
  AmendmentRow,
  LinkedWork,
  Politician,
  Related,
} from "@/lib/politicians/queries";
import {
  formatBRL,
  formatBRLCompact,
  formatDate,
  formatInteger,
} from "@/lib/works/format";

import styles from "./perfil.module.css";
import { RelatedList } from "./sections";
import { HOUSE, NOT_YET, OFFICE, OFFICIAL, STATUS } from "./shared";

type Mandate = Politician["mandates"][number];

export function Mandates({
  p,
  current,
}: {
  p: Politician;
  current: Mandate | undefined;
}) {
  return (
    <Card aria-labelledby="mandatos">
      <h2 id="mandatos" className={styles.h2}>
        Mandatos e partidos
      </h2>
      <ul className={styles.list}>
        {p.mandates.map((m) => {
          const official = p.externalIds[m.house]
            ? OFFICIAL[m.house](p.externalIds[m.house]!)
            : null;
          return (
            <li key={`${m.house}-${m.startedOn}`}>
              <strong>{OFFICE[m.office] ?? m.office}</strong> — {HOUSE[m.house]}
              , {m.uf}. Desde {formatDate(m.startedOn)}
              {m.endedOn ? ` até ${formatDate(m.endedOn)}` : ""}.{" "}
              {m.endedOn ? "Encerrado." : STATUS[m.status]}
              {official ? (
                <>
                  {" "}
                  <a href={official} rel="noopener noreferrer">
                    Ver no site oficial
                  </a>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      {p.affiliations.length ? (
        <>
          <h3 className={styles.h3}>Partidos</h3>
          <ul className={styles.list} data-testid="filiacoes">
            {p.affiliations.map((a, i) => (
              <li key={i}>
                {a.party.name} ({a.party.acronym})
                {a.startedOn ? `, desde ${formatDate(a.startedOn)}` : ""}
                {a.endedOn
                  ? ` até ${formatDate(a.endedOn)}`
                  : a.startedOn
                    ? ""
                    : ", filiação atual"}
                .
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p className={styles.source}>
        Fonte: {current ? HOUSE[current.house] : "casas legislativas"}
        {p.collectedAt
          ? `, dados coletados pelo Cobra em ${formatDate(p.collectedAt)}`
          : ""}
        .
      </p>
    </Card>
  );
}

export function AmendmentsCard({
  amendments,
  current,
}: {
  amendments: AmendmentRow[];
  current: Mandate | undefined;
}) {
  const total = amendments.reduce(
    (s, a) => ({ committed: s.committed + a.committed, paid: s.paid + a.paid }),
    { committed: 0, paid: 0 },
  );
  return (
    <Card aria-labelledby="emendas" data-testid="emendas">
      <h2 id="emendas" className={styles.h2}>
        Emendas com destino ao DF
      </h2>
      <p className={styles.note}>
        O Cobra guarda, no piloto, as emendas com destino ao Distrito Federal e
        as citadas por obras do DF. Emendas para outros lugares ainda não estão
        aqui.
      </p>
      {current?.house === "cldf" && amendments.length === 0 ? (
        <p data-testid="emendas-distrital">
          Emendas ao orçamento federal são indicadas por deputados federais e
          senadores. As emendas dos deputados distritais ao orçamento do DF
          ainda não estão no Cobra.
        </p>
      ) : amendments.length ? (
        <>
          <p data-testid="emendas-total">
            {amendments.length === 1
              ? "1 emenda"
              : `${formatInteger(amendments.length)} emendas`}
            , com {formatBRL(total.committed)} empenhados e{" "}
            {formatBRL(total.paid)} pagos.
          </p>
          <ul className={styles.list}>
            {amendments.map((a) => (
              <li key={a.code}>
                <strong>{a.year}</strong> ·{" "}
                {a.mainFunction ?? "área não informada"} · {a.locality} ·
                empenhado {formatBRLCompact(a.committed)}, pago{" "}
                {formatBRLCompact(a.paid)}{" "}
                <span className={styles.code}>(emenda {a.code})</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>O Cobra não tem emendas deste político com destino ao DF.</p>
      )}
      <p className={styles.source}>Fonte: Portal da Transparência (CGU).</p>
    </Card>
  );
}

export function WorksCard({ works }: { works: LinkedWork[] }) {
  return (
    <Card aria-labelledby="obras" data-testid="obras">
      <h2 id="obras" className={styles.h2}>
        Obras pagas por essas emendas
      </h2>
      {works.length ? (
        <ul className={styles.list}>
          {works.map((w) => (
            <li key={`${w.code}-${w.amendment}`}>
              <Link href={`/obras/${encodeURIComponent(w.code)}`}>
                {w.name}
              </Link>{" "}
              <WorkStatus status={w.status} />{" "}
              <span className={styles.note}>
                · vínculo {w.confidence}: um empenho da obra cita a emenda{" "}
                {w.amendment}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhuma obra do DF ligada às emendas deste político.</p>
      )}
      <p className={styles.source}>
        Fonte: Obrasgov.br e Portal da Transparência.
      </p>
    </Card>
  );
}

export function NotYetCard() {
  return (
    <Card aria-labelledby="ainda-nao">
      <h2 id="ainda-nao" className={styles.h2}>
        Ainda não está no Cobra
      </h2>
      <dl className={styles.notYet} data-testid="ainda-nao">
        {NOT_YET.map(([label, why]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <span aria-hidden="true">—</span>
              <span className="sr-only">Sem dado.</span> Ainda não está no
              Cobra: {why}.
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function FaqCard({ faq }: { faq: [string, string][] }) {
  return (
    <Card aria-labelledby="perguntas">
      <h2 id="perguntas" className={styles.h2}>
        Perguntas frequentes
      </h2>
      <dl className={styles.faq}>
        {faq.map(([q, a]) => (
          <div key={q}>
            <dt>{q}</dt>
            <dd>{a}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function RelatedCard({
  p,
  current,
  ufName,
  related,
}: {
  p: Politician;
  current: Mandate | undefined;
  ufName: string | null;
  related: { sameUf: Related[]; sameParty: Related[] };
}) {
  return (
    <Card aria-labelledby="relacionados" data-testid="relacionados">
      <h2 id="relacionados" className={styles.h2}>
        Políticos relacionados
      </h2>
      <p className={styles.note}>Em ordem alfabética.</p>
      <RelatedList
        title={
          ufName
            ? `Também ${FLAGS[current!.uf]?.preposition ?? "de"} ${ufName}`
            : null
        }
        people={related.sameUf}
      />
      <RelatedList
        title={p.party ? `Também do ${p.party.name}` : null}
        people={related.sameParty}
      />
    </Card>
  );
}
