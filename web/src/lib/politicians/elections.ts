// Electoral history on the profile (change ingestao-tse-candidaturas, design D5): the TSE
// result in plain, gender-neutral Portuguese, and the parties in the order of the elections.

const RESULT: Record<string, string> = {
  ELEITO: "Eleito(a)",
  "ELEITO POR QP": "Eleito(a) por quociente partidário",
  "ELEITO POR MÉDIA": "Eleito(a) por média",
  "ELEITO POR MEDIA": "Eleito(a) por média",
  SUPLENTE: "Suplente",
  "NÃO ELEITO": "Não eleito(a)",
  "NAO ELEITO": "Não eleito(a)",
  "2º TURNO": "Foi ao 2º turno",
};

/** The TSE result as shown on the profile; "—" when the TSE does not inform it. */
export function resultLabel(result: string | null): string {
  if (!result) return "—";
  return RESULT[result.toUpperCase()] ?? result;
}

/** "DEPUTADO FEDERAL" → "Deputado federal". */
export function officeLabel(office: string): string {
  const lower = office.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

/** Parties in the order of the elections, without repeating consecutive ones. */
export function partyTimeline(
  candidacies: { year: number; party: string | null }[],
): { party: string; from: number; to: number }[] {
  const ordered = [...candidacies]
    .filter((c) => c.party)
    .sort((a, b) => a.year - b.year);
  const out: { party: string; from: number; to: number }[] = [];
  for (const c of ordered) {
    const last = out.at(-1);
    if (last && last.party === c.party) last.to = c.year;
    else out.push({ party: c.party!, from: c.year, to: c.year });
  }
  return out;
}
