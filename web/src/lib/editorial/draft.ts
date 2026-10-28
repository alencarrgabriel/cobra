import Anthropic from "@anthropic-ai/sdk";

// AI draft of a vote summary (change rascunho-ia, design D1). The draft is never published by
// itself: it becomes a version an editor reviews and approves (DDR §6, RF-13).

export const DRAFT_MODEL = "claude-haiku-5-5";

const MIN_TEXT = 40;
const MAX_TEXT = 4000;

// Editorial rules of DDR §9.1, fixed so every vote gets the same treatment.
const SYSTEM = `Você escreve rascunhos de resumo de votações do Congresso brasileiro para o Cobra, um site neutro de dados oficiais. Um editor humano revisa e aprova cada texto antes de publicar.

Regras:
- Português do Brasil, linguagem simples, de 2 a 4 frases curtas, em um parágrafo.
- Diga o que foi votado e o que a proposição muda, a partir da ementa e da descrição; depois o resultado e a contagem.
- Se houver orientações de Governo e Oposição, diga quais foram, sem interpretar.
- Use só os dados fornecidos. Não invente argumentos, números, nomes, datas nem consequências.
- Nenhum adjetivo de valor ("polêmico", "importante", "absurdo", "histórico", "pauta-bomba" e semelhantes) e nenhuma opinião.
- Mesmo tratamento para qualquer partido ou político.
- Responda só com o texto do resumo, sem título, sem marcadores e sem comentários.`;

export type VoteFacts = {
  house: string;
  occurredOn: string;
  label: string | null;
  summary: string | null;
  description: string;
  approved: boolean | null;
  yes: number;
  no: number;
  other: number;
  orientations: { bench: string; orientation: string }[];
};

/** The user message: official data only, in labeled lines. */
export function draftPrompt(v: VoteFacts): string {
  const house =
    v.house === "senado" ? "Senado Federal" : "Câmara dos Deputados";
  const result =
    v.approved === true
      ? "aprovado"
      : v.approved === false
        ? "rejeitado"
        : "não informado";
  const lines = [
    `Casa: ${house}`,
    `Data: ${v.occurredOn}`,
    `Proposição: ${v.label ?? "não informada"}`,
    `Ementa: ${v.summary ?? "não informada"}`,
    `Descrição da votação: ${v.description}`,
    `Resultado: ${result}`,
    `Contagem: Sim ${v.yes}, Não ${v.no}, outros ${v.other}`,
  ];
  if (v.orientations.length) {
    lines.push(
      `Orientações: ${v.orientations.map((o) => `${o.bench}: ${o.orientation}`).join("; ")}`,
    );
  }
  return lines.join("\n");
}

export type DraftResult =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: "sem-chave" | "recusa" | "indisponivel" | "tamanho" };

/** Minimal surface of the SDK client the draft needs (a fake one in tests). */
export type MessagesClient = {
  messages: { create: Anthropic["messages"]["create"] };
};

export function hasDraftKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function draftSummary(
  facts: VoteFacts,
  client?: MessagesClient,
): Promise<DraftResult> {
  if (!client && !hasDraftKey()) return { ok: false, reason: "sem-chave" };
  const api = client ?? new Anthropic();
  let message: Anthropic.Message;
  try {
    message = (await api.messages.create({
      model: DRAFT_MODEL,
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: draftPrompt(facts) }],
    })) as Anthropic.Message;
  } catch (error) {
    if (error instanceof Anthropic.APIError)
      return { ok: false, reason: "indisponivel" };
    throw error;
  }
  if (message.stop_reason === "refusal") return { ok: false, reason: "recusa" };
  const text = message.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
  if (text.length < MIN_TEXT || text.length > MAX_TEXT) {
    return { ok: false, reason: "tamanho" };
  }
  return { ok: true, text, model: DRAFT_MODEL };
}
