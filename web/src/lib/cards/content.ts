import { FLAGS } from "@/lib/geo/flags";
import type { Politician } from "@/lib/politicians/queries";
import { whoIs } from "@/lib/politicians/who";
import type { House } from "@/lib/representatives/queries";
import {
  formatBRL,
  formatBRLCompact,
  formatInteger,
  monthsAgoLabel,
  monthsSince,
  STATUS_INFO,
} from "@/lib/works/format";
import type { WorkStatus } from "@/lib/works/filters";

// What each share card says (change compartilhamento, design D3). Pure functions: the same
// template for any party or politician, and "—" when the source does not inform a value.

export type CardContent = {
  kicker: string;
  title: string;
  /** Party acronym in its color (identity rule, the same for all parties). */
  badge: { text: string; color: string } | null;
  /** Work status, in the status color of the light theme. */
  status: { text: string; color: string } | null;
  lines: string[];
  photo: { url: string | null; initials: string } | null;
  flagUf: string | null;
  source: string;
  updatedOn: string | null;
};

const OFFICE: Record<string, string> = {
  senador: "Senador(a)",
  deputado_federal: "Deputado(a) federal",
  deputado_distrital: "Deputado(a) distrital",
};

const HOUSE: Record<House, string> = {
  senado: "Senado Federal",
  camara: "Câmara dos Deputados",
  cldf: "Câmara Legislativa do DF",
};

const MEMBERS: Record<House, [string, string]> = {
  senado: ["senador(a)", "senadores(as)"],
  camara: ["deputado(a) federal", "deputados(as) federais"],
  cldf: ["deputado(a) distrital", "deputados(as) distritais"],
};

// Light theme values of the status tokens in globals.css (an image has no CSS variables).
const STATUS_HEX: Record<WorkStatus, string> = {
  completed: "#2e7d4f",
  in_progress: "#0d7276",
  stopped: "#b42346",
  unfinished: "#b42346",
  registered: "#6f706a",
  cancelled: "#6f706a",
};

const MAX_TITLE = 120;

/** Collapses spaces as the source sends them and cuts long text with "…". */
export function clip(raw: string, max = MAX_TITLE): string {
  const text = raw.replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = [words[0], words.length > 1 ? words.at(-1) : undefined]
    .filter(Boolean)
    .map((w) => w![0]!.toUpperCase());
  return letters.join("");
}

export function politicianCard(
  p: Politician,
  amendments: { count: number; committed: number },
): CardContent {
  const current = p.mandates.find((m) => m.endedOn === null) ?? p.mandates[0];
  const lines = [
    current
      ? whoIs({
          name: p.name,
          house: current.house,
          uf: current.uf,
          status: current.status,
          startedOn: current.startedOn,
          endedOn: current.endedOn,
          party: p.party,
        })
      : `${p.name} está no cadastro do Cobra.`,
  ];
  const sources = [current ? HOUSE[current.house] : "Casas legislativas"];
  if (amendments.count > 0) {
    lines.push(
      `${amendments.count === 1 ? "1 emenda" : `${formatInteger(amendments.count)} emendas`} com destino ao DF, com ${formatBRLCompact(amendments.committed)} empenhados.`,
    );
    sources.push("Portal da Transparência");
  }
  return {
    kicker: current
      ? `${OFFICE[current.office] ?? current.office} · ${FLAGS[current.uf]?.name ?? current.uf}`
      : "Político",
    title: clip(p.name),
    badge: p.party ? { text: p.party.acronym, color: p.party.color } : null,
    status: null,
    lines,
    photo: { url: p.photoUrl, initials: initials(p.name) },
    flagUf: null,
    source: sources.join("; "),
    updatedOn: p.collectedAt,
  };
}

export type PlaceForCard = {
  kind: "uf" | "municipality";
  name: string;
  uf: string;
};

export function placeTitle(place: PlaceForCard): string {
  if (place.kind === "municipality")
    return `Representantes de ${place.name} (${place.uf})`;
  return `Representantes ${FLAGS[place.uf]?.preposition ?? "de"} ${place.name}`;
}

export function placeCard(
  place: PlaceForCard,
  counts: Partial<Record<House, number>>,
  updatedOn: string | null,
): CardContent {
  const houses = (["senado", "camara", "cldf"] as House[]).filter(
    (h) => (counts[h] ?? 0) > 0,
  );
  return {
    kicker: "Seus representantes",
    title: clip(placeTitle(place)),
    badge: null,
    status: null,
    lines: houses.map((h) => {
      const n = counts[h]!;
      return `${formatInteger(n)} ${MEMBERS[h][n === 1 ? 0 : 1]} ${h === "senado" ? "no" : "na"} ${HOUSE[h]}`;
    }),
    photo: null,
    flagUf: place.uf,
    source: houses.map((h) => HOUSE[h]).join("; ") || "Casas legislativas",
    updatedOn,
  };
}

export type WorkForCard = {
  name: string;
  type: string | null;
  status: WorkStatus;
  stoppedSince: string | null;
  plannedValue: number | null;
  progress: number | null;
  address: string | null;
  sourceUpdatedAt: string | null;
  collectedAt: string;
};

export function workCard(work: WorkForCard, today: Date): CardContent {
  const label = STATUS_INFO[work.status].label;
  const since =
    work.status === "stopped" && work.stoppedSince
      ? ` ${monthsAgoLabel(monthsSince(work.stoppedSince, today))}`
      : "";
  return {
    kicker: work.type ?? "Obra",
    title: clip(work.name),
    badge: null,
    status: { text: `${label}${since}`, color: STATUS_HEX[work.status] },
    lines: [
      `Valor previsto: ${work.plannedValue === null ? "—" : formatBRL(work.plannedValue)}`,
      `Execução física: ${work.progress === null ? "—" : `${formatInteger(work.progress)}%`}`,
      ...(work.address ? [clip(work.address, 90)] : []),
    ],
    photo: null,
    flagUf: null,
    source: "Obrasgov.br",
    updatedOn: work.sourceUpdatedAt ?? work.collectedAt,
  };
}

export type VoteForCard = {
  house: string;
  occurredOn: string;
  label: string | null;
  description: string;
  approved: boolean | null;
  yes: number;
  no: number;
  other: number;
  collectedAt: string;
};

const VOTE_HOUSE: Record<string, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
};

/** Vote card (change feed-e-pagina-votacao, design D4): the official count, no judgment. */
export function voteCard(v: VoteForCard): CardContent {
  return {
    kicker: `${VOTE_HOUSE[v.house] ?? v.house} · ${formatDateBr(v.occurredOn)}`,
    title: clip(v.label ?? "Votação"),
    badge: null,
    status:
      v.approved === null
        ? null
        : { text: v.approved ? "Aprovado" : "Rejeitado", color: "#5c5e58" },
    lines: [
      `Sim ${formatInteger(v.yes)} · Não ${formatInteger(v.no)} · outros ${formatInteger(v.other)}`,
      clip(v.description, 140),
    ],
    photo: null,
    flagUf: null,
    source: VOTE_HOUSE[v.house] ?? v.house,
    updatedOn: v.collectedAt,
  };
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
