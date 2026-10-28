// Pure rules of the error report channel (change reporte-de-erro, designs D2 and D3).

export const RESPONSE_BUSINESS_DAYS = 5;
export const PURGE_DAYS = 90;
export const MIN_TEXT = 20;
export const MAX_TEXT = 2000;

/** `start` plus `days` business days (Monday to Friday; holidays are not counted). */
export function addBusinessDays(start: string, days: number): string {
  const d = new Date(`${start}T12:00:00Z`);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const weekday = d.getUTCDay();
    if (weekday !== 0 && weekday !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Today in Brasília (UTC-3, no daylight saving), as YYYY-MM-DD. */
export function todayInBrasilia(now: Date = new Date()): string {
  return new Date(now.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

/** Only addresses of public data pages, in canonical form; anything else is rejected, so the
 *  public queue never shows a private link (a "Meus dados" token) or free text in a URL. */
const PAGES: RegExp[] = [
  /^\/$/,
  /^\/votacoes(\/\d{1,12})?$/,
  /^\/obras(\/[\w.-]{1,40})?$/,
  /^\/planos(\/[\w-]{1,60})?$/,
  /^\/representantes(\/\d{2}(\d{5})?)?$/,
  /^\/(metodologia|privacidade|alertas)$/,
];

export function pagePath(raw: string): string | null {
  let path = raw.trim().replace(/[?#].*$/, "");
  try {
    path = new URL(path, "http://x").pathname;
  } catch {
    return null;
  }
  if (path.length > 1) path = path.replace(/\/$/, "");
  const profile = /^\/politicos\/(\d{1,12})(-[a-z0-9-]*)?$/.exec(path);
  if (profile) return `/politicos/${profile[1]}`;
  return PAGES.some((p) => p.test(path)) ? path : null;
}

export const KIND_LABEL = {
  erro: "Erro num dado",
  contestacao: "Contestação da pessoa retratada",
} as const;

export const STATUS_LABEL = {
  recebido: "Recebido",
  em_analise: "Em análise",
  corrigido: "Corrigido",
  sem_alteracao: "Sem alteração: o dado confere com a fonte",
} as const;

export type ReportKind = keyof typeof KIND_LABEL;
export type ReportStatus = keyof typeof STATUS_LABEL;

export const isClosed = (s: ReportStatus) =>
  s === "corrigido" || s === "sem_alteracao";
