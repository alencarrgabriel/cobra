import { FLAGS } from "@/lib/geo/flags";
import { formatDate } from "@/lib/works/format";

// "Quem é" sentence (RF-35): a fixed template with official data only, no AI, and in a form
// that does not depend on gender, which Cobra does not store (change perfil-do-politico, D3).

export type HouseSlug = "senado" | "camara" | "cldf";

const HOUSE: Record<HouseSlug, string> = {
  senado: "no Senado Federal",
  camara: "na Câmara dos Deputados",
  cldf: "na Câmara Legislativa do Distrito Federal",
};

/** "do" → "pelo", "da" → "pela", "de" → "por" (per UF, from the flags table). */
const BY: Record<string, string> = { do: "pelo", da: "pela", de: "por" };

export type WhoInput = {
  name: string;
  house: HouseSlug;
  uf: string;
  status: "titular" | "suplente" | "licenciado";
  startedOn: string;
  endedOn: string | null;
  party: { name: string } | null;
};

/** The CLDF already names the DF, so the UF is not repeated. */
const where = (house: HouseSlug, uf: string) =>
  house === "cldf" ? "" : ` ${byUf(uf)}`;

function byUf(uf: string): string {
  const flag = FLAGS[uf];
  return flag ? `${BY[flag.preposition] ?? "por"} ${flag.name}` : `por ${uf}`;
}

/** The party name with the right contraction: "pelo Republicanos", "pelo Partido Liberal". */
function byParty(name: string): string {
  return `pelo ${name}`;
}

export function whoIs(input: WhoInput): string {
  const { name, house } = input;
  if (input.endedOn) {
    return `${name} teve mandato ${HOUSE[house]}${where(house, input.uf)} até ${formatDate(input.endedOn)}.`;
  }
  const verb =
    input.status === "suplente"
      ? `exerce o mandato como suplente ${HOUSE[house]}`
      : `tem mandato ${HOUSE[house]}`;
  const party = input.party ? `, ${byParty(input.party.name)}` : "";
  const leave =
    input.status === "licenciado"
      ? ", com o exercício hoje suspenso por licença"
      : "";
  return `${name} ${verb}${where(house, input.uf)}${party}, desde ${formatDate(input.startedOn)}${leave}.`;
}

/** "Damares Alves" → "damares-alves". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function profilePath(id: number, name: string): string {
  return `/politicos/${id}-${slugify(name)}`;
}

/** JSON for <script type="application/ld+json">, safe inside HTML. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
