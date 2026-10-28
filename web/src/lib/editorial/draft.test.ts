import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import {
  draftPrompt,
  draftSummary,
  type MessagesClient,
  type VoteFacts,
} from "./draft";

const FACTS: VoteFacts = {
  house: "camara",
  occurredOn: "2026-06-10",
  label: "PL 11/2003",
  summary: "Proíbe peças publicitárias com imagens sexuais.",
  description: "Aprovado o projeto.",
  approved: true,
  yes: 300,
  no: 150,
  other: 2,
  orientations: [
    { bench: "Governo", orientation: "sim" },
    { bench: "Oposição", orientation: "nao" },
  ],
};

const TEXT =
  "A Câmara aprovou o PL 11/2003, que proíbe peças publicitárias com imagens sexuais, por 300 votos a 150.";

function fake(response: Partial<Anthropic.Message> | Error): MessagesClient {
  return {
    messages: {
      create: vi.fn(async () => {
        if (response instanceof Error) throw response;
        return { content: [], stop_reason: "end_turn", ...response };
      }) as unknown as MessagesClient["messages"]["create"],
    },
  };
}

describe("AI draft", () => {
  it("sends only the official facts of the vote", () => {
    expect(draftPrompt(FACTS)).toBe(
      [
        "Casa: Câmara dos Deputados",
        "Data: 2026-06-10",
        "Proposição: PL 11/2003",
        "Ementa: Proíbe peças publicitárias com imagens sexuais.",
        "Descrição da votação: Aprovado o projeto.",
        "Resultado: aprovado",
        "Contagem: Sim 300, Não 150, outros 2",
        "Orientações: Governo: sim; Oposição: nao",
      ].join("\n"),
    );
  });

  it("returns the text and the model", async () => {
    const result = await draftSummary(
      FACTS,
      fake({ content: [{ type: "text", text: TEXT, citations: null }] }),
    );
    expect(result).toEqual({ ok: true, text: TEXT, model: "claude-haiku-5-5" });
  });

  it("reports a refusal, an API error and a text out of bounds", async () => {
    expect(await draftSummary(FACTS, fake({ stop_reason: "refusal" }))).toEqual(
      {
        ok: false,
        reason: "recusa",
      },
    );
    const apiError = new Anthropic.APIError(
      503,
      undefined,
      "indisponível",
      undefined,
    );
    expect(await draftSummary(FACTS, fake(apiError))).toEqual({
      ok: false,
      reason: "indisponivel",
    });
    expect(
      await draftSummary(
        FACTS,
        fake({ content: [{ type: "text", text: "Curto.", citations: null }] }),
      ),
    ).toEqual({ ok: false, reason: "tamanho" });
  });
});
