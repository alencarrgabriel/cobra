// Relevance criteria in words (change relevancia-e-eventos, design D4).

const WORDS: Record<string, (type: string | null) => string> = {
  divergencia: () => "Governo e Oposição divergiram",
  placar_disputado: () => "placar disputado",
  tipo_de_materia: (type) => `tipo de matéria: ${type ?? "—"}`,
  curadoria: () => "escolha editorial justificada",
};

/** "Votação relevante: placar disputado; tipo de matéria: PEC", or null when not relevant. */
export function relevanceText(
  criteria: string[],
  propositionType: string | null,
): string | null {
  const parts = criteria.map((c) => WORDS[c]?.(propositionType) ?? c);
  return parts.length ? `Votação relevante: ${parts.join("; ")}` : null;
}
