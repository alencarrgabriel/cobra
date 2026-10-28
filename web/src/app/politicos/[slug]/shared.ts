import { FLAGS } from "@/lib/geo/flags";
import type { Politician } from "@/lib/politicians/queries";
import { type HouseSlug, whoIs } from "@/lib/politicians/who";

// Constants shared by the profile layout and its tabs (change perfil-em-abas-e-jornada).

export const DESCRIPTION =
  "Mandato, partido, emendas e obras de um político, com fonte oficial.";

/** The "Quem é" sentence of the current (or latest) mandate. */
export function sentence(p: Politician): string {
  const current = p.mandates.find((m) => m.endedOn === null) ?? p.mandates[0];
  return current
    ? whoIs({
        name: p.name,
        house: current.house,
        uf: current.uf,
        status: current.status,
        startedOn: current.startedOn,
        endedOn: current.endedOn,
        party: p.party,
      })
    : `${p.name} está no cadastro do Cobra.`;
}

export const HOUSE: Record<HouseSlug, string> = {
  senado: "Senado Federal",
  camara: "Câmara dos Deputados",
  cldf: "Câmara Legislativa do DF",
};
export const OFFICE: Record<string, string> = {
  senador: "Senador(a)",
  deputado_federal: "Deputado(a) federal",
  deputado_distrital: "Deputado(a) distrital",
};
export const STATUS: Record<string, string> = {
  titular: "Em exercício",
  suplente: "Suplente em exercício",
  licenciado: "Licenciado(a) do exercício",
};
export const OFFICIAL: Record<HouseSlug, (id: string) => string | null> = {
  camara: (id) => `https://www.camara.leg.br/deputados/${id}`,
  senado: (id) =>
    `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}`,
  cldf: () => null,
};

// Blocks that need data not collected yet (DDR §9.1: "—" with the reason, never zero).
export const NOT_YET: [string, string][] = [
  ["Projetos de autoria e relatoria", "vem com a coleta de proposições"],
];

export const ufNameOf = (uf: string | undefined) =>
  uf ? (FLAGS[uf]?.name ?? uf) : null;

/** The politician id in the first segment of the address (`42-nome` gives 42). */
export const idOf = (slug: string) => Number(/^\d+/.exec(slug)?.[0] ?? NaN);

/** The tabs, in a fixed order for every politician. */
export const TABS = [
  { key: "", label: "Resumo" },
  { key: "votos", label: "Votos" },
  { key: "presenca", label: "Presença" },
  { key: "gastos", label: "Gastos" },
  { key: "emendas", label: "Emendas e obras" },
  { key: "trajetoria", label: "Trajetória" },
  { key: "patrimonio", label: "Patrimônio e campanha" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];
