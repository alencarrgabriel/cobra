"use client";

import { useState } from "react";

import { Button } from "@/components/Button/Button";
import { Kpi } from "@/components/Kpi/Kpi";
import { RepresentativeCard } from "@/components/RepresentativeCard/RepresentativeCard";
import { SidePanel } from "@/components/SidePanel/SidePanel";
import { Toast } from "@/components/Toast/Toast";
import { VoteBadge } from "@/components/Vote/Vote";

import styles from "./design.module.css";
import { FAKE_FLAG, FAKE_PEOPLE } from "./fake-data";

/** Interactive demos: representative cards opening the side panel, and a toast. */
export function DesignDemos() {
  const [selected, setSelected] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const person = selected === null ? null : FAKE_PEOPLE[selected]!;

  return (
    <>
      <div className={styles.grid}>
        {FAKE_PEOPLE.map((p, i) => (
          <RepresentativeCard
            key={p.name}
            name={p.name}
            party={p.party}
            uf="UF"
            flag={FAKE_FLAG}
            selected={selected === i}
            onClick={() => setSelected(i)}
          />
        ))}
      </div>
      <div className={styles.row}>
        <Button onClick={() => setToast("Link copiado")}>Copiar link</Button>
      </div>
      <SidePanel
        open={person !== null}
        title={person?.name ?? ""}
        onClose={() => setSelected(null)}
      >
        {person ? (
          <>
            <div className={styles.kpis}>
              <Kpi
                value={String(person.presence)}
                unit="%"
                label="presença nas votações do plenário"
                share={person.presence / 100}
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
            </div>
            <div className={styles.voteRow}>
              <VoteBadge option="yes" />
              <span>Câmara aprova projeto fictício de exemplo</span>
            </div>
          </>
        ) : null}
      </SidePanel>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
