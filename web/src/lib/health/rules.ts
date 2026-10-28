// Health of each integration (change saude-integracoes, design D2). Pure: tested without a
// database.

export const SOURCES = [
  "camara",
  "cldf",
  "ibge",
  "obrasgov",
  "senado",
  "transparencia",
  "tse",
] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_NAME: Record<Source, string> = {
  camara: "Câmara dos Deputados",
  cldf: "CLDF",
  ibge: "IBGE",
  obrasgov: "Obrasgov.br",
  senado: "Senado Federal",
  transparencia: "Portal da Transparência",
  tse: "TSE",
};

const DAY = 86_400_000;

/** How old the last success may be (DDR RNF-05 to RNF-07). */
export const TARGET_MS: Record<Source, number> = {
  camara: DAY,
  cldf: DAY,
  obrasgov: DAY,
  senado: DAY,
  transparencia: DAY,
  ibge: 30 * DAY,
  tse: 30 * DAY,
};

export type HealthStatus = "em_dia" | "atrasada" | "com_falha" | "sem_coleta";

export const HEALTH_LABEL: Record<HealthStatus, string> = {
  em_dia: "Em dia",
  atrasada: "Atrasada",
  com_falha: "Com falha",
  sem_coleta: "Sem coleta",
};

export type SourceFacts = {
  lastRun: { status: "running" | "ok" | "partial" | "failed" } | null;
  lastSuccessAt: string | null;
  /** Failed jobs created in the last 7 days. */
  recentFailures: number;
};

export function healthOf(
  source: Source,
  facts: SourceFacts,
  now: Date,
): HealthStatus {
  if (!facts.lastRun) return "sem_coleta";
  if (facts.lastRun.status === "failed" || facts.recentFailures > 0) {
    return "com_falha";
  }
  if (
    !facts.lastSuccessAt ||
    now.getTime() - new Date(facts.lastSuccessAt).getTime() > TARGET_MS[source]
  ) {
    return "atrasada";
  }
  return "em_dia";
}

/** Sources that should alert the team (design D4). */
export const needsAlert = (s: HealthStatus) =>
  s === "com_falha" || s === "atrasada";
