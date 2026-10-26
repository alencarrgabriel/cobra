// URL filters of /obras (design D3). Invalid values fall back to the default, never an error.

export const WORK_STATUSES = [
  "completed",
  "in_progress",
  "stopped",
  "unfinished",
  "registered",
  "cancelled",
] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

/** Status as written in the address, Portuguese without accents. */
export const STATUS_SLUGS: Record<WorkStatus, string> = {
  completed: "concluida",
  in_progress: "em-execucao",
  stopped: "paralisada",
  unfinished: "inacabada",
  registered: "cadastrada",
  cancelled: "cancelada",
};

export const ORDERS = ["valor", "nome"] as const;
export type WorkOrder = (typeof ORDERS)[number];

export const PAGE_SIZE = 30;

export type WorkFilters = {
  status: WorkStatus | null;
  /** Slug of the work type ("area"); resolved against the types in the database. */
  area: string | null;
  order: WorkOrder;
  page: number;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

/** "Infraestrutura Hídrica, Portos" -> "infraestrutura-hidrica-portos". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseFilters(params: SearchParams): WorkFilters {
  const situacao = first(params.situacao);
  const status =
    WORK_STATUSES.find((s) => STATUS_SLUGS[s] === situacao) ?? null;
  const area = first(params.area);
  const ordem = first(params.ordem);
  const pagina = Number(first(params.pagina));
  return {
    status,
    area: area && /^[a-z0-9-]{1,80}$/.test(area) ? area : null,
    order: ORDERS.find((o) => o === ordem) ?? "valor",
    page:
      Number.isInteger(pagina) && pagina >= 1 && pagina <= 10_000 ? pagina : 1,
  };
}

/** Address of /obras with the given filters; defaults are left out so links stay short. */
export function filtersHref(f: WorkFilters): string {
  const q = new URLSearchParams();
  if (f.status) q.set("situacao", STATUS_SLUGS[f.status]);
  if (f.area) q.set("area", f.area);
  if (f.order !== "valor") q.set("ordem", f.order);
  if (f.page > 1) q.set("pagina", String(f.page));
  const s = q.toString();
  return s ? `/obras?${s}` : "/obras";
}
