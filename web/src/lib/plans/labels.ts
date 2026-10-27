import { FLAGS } from "@/lib/geo/flags";

import type { PlanKey } from "./slug";

/** "Presidente da República", "Governador(a) do Distrito Federal". */
export function officeTitle({ office, uf }: PlanKey): string {
  if (office === "presidente") return "Presidente da República";
  const flag = uf ? FLAGS[uf] : undefined;
  return flag
    ? `Governador(a) ${flag.preposition} ${flag.name}`
    : `Governador(a) ${uf ?? ""}`.trim();
}

/** "IBANEIS ROCHA e CELINA LEÃO (MDB)", as registered at the TSE. */
export function ticket(plan: {
  holder: string;
  runningMate: string | null;
  party: string | null;
}): string {
  const names = [plan.holder, plan.runningMate].filter(Boolean).join(" e ");
  return plan.party ? `${names} (${plan.party})` : names;
}
