import type { WorkStatus } from "./filters";

// Texts and colors of each status (design D6). Colors are design tokens.
export const STATUS_INFO: Record<
  WorkStatus,
  { label: string; color: string; hint?: string }
> = {
  completed: { label: "Concluída", color: "var(--work-done)" },
  in_progress: { label: "Em execução", color: "var(--work-exec)" },
  stopped: { label: "Paralisada", color: "var(--work-stop)" },
  unfinished: { label: "Inacabada", color: "var(--work-stop)" },
  registered: {
    label: "Cadastrada",
    color: "var(--work-idle)",
    hint: "registrada pelo gestor, sem início informado",
  },
  cancelled: { label: "Cancelada", color: "var(--work-idle)" },
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const DECIMAL = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const INTEGER = new Intl.NumberFormat("pt-BR");

/** Full value for the work page: "R$ 5.900.000,00". */
export function formatBRL(value: number): string {
  return BRL.format(value);
}

/** Compact value for lists: "R$ 1,2 mi", "R$ 78,9 bi", "R$ 600 mil". */
export function formatBRLCompact(value: number): string {
  const scales: [number, string][] = [
    [1e9, "bi"],
    [1e6, "mi"],
    [1e3, "mil"],
  ];
  for (const [size, unit] of scales) {
    if (Math.abs(value) >= size) {
      return `R$ ${DECIMAL.format(Math.round((value / size) * 10) / 10)} ${unit}`;
    }
  }
  return BRL.format(value);
}

export function formatInteger(value: number): string {
  return INTEGER.format(value);
}

/** "07/05/2025" from an ISO date (YYYY-MM-DD), without time zone shifts. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Whole months between an ISO date and today (both as calendar dates). */
export function monthsSince(iso: string, today: Date): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
  if (today.getDate() < d) months -= 1;
  return Math.max(0, months);
}

/** "há 1 mês", "há 17 meses", "há menos de 1 mês". */
export function monthsAgoLabel(months: number): string {
  if (months < 1) return "há menos de 1 mês";
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}
