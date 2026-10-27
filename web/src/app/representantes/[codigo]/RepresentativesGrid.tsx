"use client";

import Link from "next/link";
import { useState } from "react";

import { RepresentativeCard } from "@/components/RepresentativeCard/RepresentativeCard";
import { SidePanel } from "@/components/SidePanel/SidePanel";
import { UfFlag } from "@/components/UfFlag/UfFlag";
import { NEUTRAL_PARTY_COLOR } from "@/lib/party-color";
import { profilePath } from "@/lib/politicians/who";
import type { House, Representative } from "@/lib/representatives/queries";
import { formatDate } from "@/lib/works/format";

import styles from "../representantes.module.css";

const OFFICE: Record<House, string> = {
  senado: "Senador(a) — Senado Federal",
  camara: "Deputado(a) federal — Câmara dos Deputados",
  cldf: "Deputado(a) distrital — Câmara Legislativa do DF",
};

const SOURCE: Record<House, string> = {
  senado: "Ver no site do Senado",
  camara: "Ver no site da Câmara",
  cldf: "Ver no site da CLDF",
};

/** Cards of one house; touching a card opens the summary panel (RF-09, design D5). */
export function RepresentativesGrid({ people }: { people: Representative[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const person = people.find((p) => p.id === selected) ?? null;
  return (
    <>
      <ul className={styles.grid}>
        {people.map((p) => (
          <li key={`${p.house}-${p.id}`}>
            <RepresentativeCard
              name={p.name}
              party={
                p.party ?? {
                  acronym: "Sem partido",
                  color: NEUTRAL_PARTY_COLOR,
                }
              }
              uf={p.uf}
              photoUrl={p.photoUrl ?? undefined}
              flag={<UfFlag uf={p.uf} />}
              selected={selected === p.id}
              onClick={() => setSelected(p.id)}
            />
          </li>
        ))}
      </ul>
      <SidePanel
        open={person !== null}
        title={person?.name ?? ""}
        onClose={() => setSelected(null)}
      >
        {person ? (
          <dl className={styles.panelFacts}>
            <div>
              <dt>Cargo</dt>
              <dd>{OFFICE[person.house]}</dd>
            </div>
            <div>
              <dt>Partido</dt>
              <dd>
                {person.party
                  ? `${person.party.name} (${person.party.acronym})`
                  : "Sem partido informado"}
              </dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>
                {person.status === "suplente"
                  ? "Suplente em exercício"
                  : "Em exercício"}
              </dd>
            </div>
            <div>
              <dt>No mandato desde</dt>
              <dd>{formatDate(person.since)}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>
                <Link href={profilePath(person.id, person.name)}>
                  Ver perfil completo
                </Link>
              </dd>
            </div>
            {person.officialUrl ? (
              <div>
                <dt>Fonte oficial</dt>
                <dd>
                  <a href={person.officialUrl} rel="noopener noreferrer">
                    {SOURCE[person.house]}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </SidePanel>
    </>
  );
}
