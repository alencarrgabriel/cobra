import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";

import {
  DataUnavailable,
  isDataUnavailable,
} from "@/app/obras/DataUnavailable";
import { Button } from "@/components/Button/Button";
import { PartyBadge } from "@/components/PartyBadge/PartyBadge";
import { Portrait } from "@/components/Portrait/Portrait";
import { ProfileTabs } from "@/components/ProfileTabs/ProfileTabs";
import { SharePanel } from "@/components/SharePanel/SharePanel";
import { UfFlag } from "@/components/UfFlag/UfFlag";
import { getPolitician, type Politician } from "@/lib/politicians/queries";
import { profilePath } from "@/lib/politicians/who";

import styles from "./perfil.module.css";
import { idOf, OFFICE, STATUS, TABS, ufNameOf } from "./shared";

// Header, tabs and footer links shared by every tab of a profile (change
// perfil-em-abas-e-jornada, design D1 and D2).
export default function ProfileLayout({
  children,
  params,
}: LayoutProps<"/politicos/[slug]">) {
  return (
    <main className={`${styles.page} gutter`}>
      <Suspense fallback={<p className={styles.note}>Carregando perfil…</p>}>
        <Frame params={params}>{children}</Frame>
      </Suspense>
    </main>
  );
}

async function Frame({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: ReactNode;
}) {
  const id = idOf((await params).slug);
  await connection();
  let p: Politician | null = null;
  try {
    p = Number.isFinite(id) ? await getPolitician(id) : null;
  } catch (error) {
    if (isDataUnavailable(error)) return <DataUnavailable />;
    throw error;
  }
  if (!p) return <DataUnavailable />;
  const current = p.mandates.find((m) => m.endedOn === null) ?? p.mandates[0];
  const base = profilePath(p.id, p.name);
  return (
    <>
      <header className={styles.header}>
        <div className={styles.portrait}>
          <Portrait
            name={p.name}
            photoUrl={p.photoUrl ?? undefined}
            partyColor={p.party?.color}
            flag={current ? <UfFlag uf={current.uf} /> : undefined}
            size="md"
          />
        </div>
        <div className={styles.identity}>
          <p className={styles.role}>
            {current
              ? `${OFFICE[current.office] ?? current.office}, ${ufNameOf(current.uf)}`
              : "Político"}
          </p>
          <h1 className={`display ${styles.title}`}>{p.name}</h1>
          <p className={styles.badges}>
            {p.party ? (
              <PartyBadge
                acronym={p.party.acronym}
                color={p.party.color}
                name={p.party.name}
              />
            ) : null}
            {current ? <span>{STATUS[current.status]}</span> : null}
          </p>
          <div className={styles.actions}>
            {/* Who follows whom lives only on the server, with a verified e-mail (RF-30). */}
            <Button href={`/alertas?seguir=${p.id}`} data-testid="seguir">
              Seguir
            </Button>
            <SharePanel
              path={base}
              text={`${p.name} no Cobra: mandato, partido, emendas e obras, com fonte oficial.`}
              card={{ kind: "politico", id: p.id }}
            />
          </div>
        </div>
      </header>

      <ProfileTabs base={base} tabs={TABS} />

      <div className={styles.tabContent}>{children}</div>

      <p className={styles.footerLinks}>
        <Link
          href={`/reportar?pagina=/politicos/${p.id}&tipo=contestacao`}
          data-testid="e-voce"
        >
          É você nesta página?
        </Link>
        <Link href={`/reportar?pagina=/politicos/${p.id}`}>
          Reportar erro nesta página
        </Link>
      </p>
    </>
  );
}
