import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { DataUnavailable } from "@/app/obras/DataUnavailable";
import { Card } from "@/components/Card/Card";
import { StatStrip } from "@/components/StatStrip/StatStrip";
import {
  getAmendments,
  getAssets,
  getAttendance,
  getExpenses,
  getRecentBallots,
  getRelated,
} from "@/lib/politicians/queries";
import { summaryStats } from "@/lib/politicians/summary-stats";
import { jsonLd, profilePath } from "@/lib/politicians/who";

import { FaqCard, Mandates, NotYetCard, RelatedCard } from "./Cards";
import { questions, structured } from "./sections";
import { sentence, ufNameOf } from "./shared";
import { profileOf, safe, tabMetadata } from "./tab";
import { VoteRow } from "./VoteRow";
import styles from "./perfil.module.css";

export function generateMetadata({ params }: PageProps<"/politicos/[slug]">) {
  return tabMetadata(params, "");
}

// Resumo: the numbers, the latest votes and the rest in short (design D2).
export default function SummaryPage({
  params,
}: PageProps<"/politicos/[slug]">) {
  return (
    <Suspense fallback={<p className={styles.note}>Carregando o resumo…</p>}>
      <Summary params={params} />
    </Suspense>
  );
}

async function Summary({ params }: { params: Promise<{ slug: string }> }) {
  // Works show "há N meses", which depends on today: rendered per request.
  await connection();
  const ctx = await profileOf(params);
  if (!ctx) return <DataUnavailable />;
  const { p, current } = ctx;
  const house = current?.house;
  const data = await safe(() =>
    Promise.all([
      getAmendments(p.id),
      getRelated(p.id, current?.ufCode ?? null, p.party?.acronym ?? null),
      getAssets(p.id),
      getRecentBallots(p.id),
      getExpenses(p.id),
      house === "camara" || house === "senado"
        ? getAttendance(p.id, house)
        : null,
    ]),
  );
  if (!data) return <DataUnavailable />;
  const [amendments, related, assets, ballots, expenses, attendance] = data;
  const base = profilePath(p.id, p.name);
  const ufName = ufNameOf(current?.uf);
  const committed = amendments.reduce((s, a) => s + a.committed, 0);
  const faq = questions(p, house, ufName, amendments.length, committed);
  const stats = summaryStats({
    base,
    house,
    attendance,
    expenses,
    amendments,
    declarations: assets.declarations,
    assetsCollectedAt: assets.collectedAt,
  });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(structured(p, house, faq)),
        }}
      />
      <StatStrip stats={stats} label="Números do mandato" />
      <section aria-labelledby="quem-e">
        <h2 id="quem-e" className="sr-only">
          Quem é
        </h2>
        <p className={styles.who} data-testid="quem-e">
          {sentence(p)}
        </p>
        <p className={styles.note}>Nome civil: {p.civilName}.</p>
      </section>

      <Card aria-labelledby="votos-recentes" data-testid="votos-recentes">
        <h2 id="votos-recentes" className={styles.h2}>
          Votações recentes
        </h2>
        {house === "camara" || house === "senado" ? (
          ballots.length ? (
            <>
              <ul className={styles.votes}>
                {ballots.slice(0, 5).map((b) => (
                  <VoteRow key={b.voteId} b={b} />
                ))}
              </ul>
              <p>
                <Link href={`${base}/votos`} className={styles.more}>
                  Ver todas as votações
                </Link>
              </p>
            </>
          ) : (
            <p>
              O Cobra não tem votos nominais deste parlamentar no Plenário desde
              2023.
            </p>
          )
        ) : (
          <p>
            <span aria-hidden="true">—</span>
            <span className="sr-only">Sem dado.</span> Ainda não está no Cobra:
            as votações da Câmara Legislativa não são coletadas.
          </p>
        )}
      </Card>

      <Mandates p={p} current={current} />
      <NotYetCard />
      <FaqCard faq={faq} />
      <RelatedCard p={p} current={current} ufName={ufName} related={related} />
    </>
  );
}
