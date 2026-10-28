// How each vote option reads on the site (changes ingestao-camara-votacoes,
// ingestao-senado-votacoes and feed-e-pagina-votacao).

export const OPTION_LABEL: Record<string, string> = {
  sim: "Sim",
  nao: "Não",
  abstencao: "Abstenção",
  obstrucao: "Obstrução",
  art17: "Art. 17",
  presidente: "Presidente da sessão (não vota)",
  presente_sem_voto: "Presente, sem registrar voto",
  ausente: "Ausente",
  nao_informado: "Não informado",
};

/** The option, with the reason the house gives for an absence ("Ausente: Licença saúde").
 *  A null option means the member was in office and has no ballot in the house's file. */
export function optionText(
  option: string | null,
  detail: string | null,
): string {
  if (option === null) return "Não registrou voto";
  const label = OPTION_LABEL[option] ?? option;
  return detail ? `${label}: ${detail}` : label;
}

export const HOUSE_NAME: Record<string, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
};

export type Ballot = {
  name: string;
  party: string | null;
  uf: string | null;
  option: string;
};

export type TallyRow = { key: string; yes: number; no: number; other: number };

const collator = new Intl.Collator("pt-BR");

/** Sim, Não and the rest per party or per UF, in alphabetical order (design D3, D5). */
export function tally(ballots: Ballot[], by: "party" | "uf"): TallyRow[] {
  const rows = new Map<string, TallyRow>();
  for (const b of ballots) {
    const key = (by === "party" ? b.party : b.uf) ?? "Sem informação";
    const row = rows.get(key) ?? { key, yes: 0, no: 0, other: 0 };
    if (b.option === "sim") row.yes += 1;
    else if (b.option === "nao") row.no += 1;
    else row.other += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => collator.compare(a.key, b.key));
}
