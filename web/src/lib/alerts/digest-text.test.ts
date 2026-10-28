import { describe, expect, it } from "vitest";

import {
  type Digest,
  digestSubject,
  digestText,
  previousWeek,
  weekOf,
} from "./digest-text";

describe("weekOf", () => {
  it("runs Monday to Sunday in Brasília time", () => {
    // Monday 2026-06-08 00:30 in Brasília is 03:30 UTC.
    expect(weekOf(new Date("2026-06-08T03:30:00Z"))).toEqual({
      start: "2026-06-08",
      end: "2026-06-14",
    });
    // Sunday 2026-06-14 23:30 in Brasília is Monday 02:30 UTC.
    expect(weekOf(new Date("2026-06-15T02:30:00Z"))).toEqual({
      start: "2026-06-08",
      end: "2026-06-14",
    });
  });

  it("crosses the year", () => {
    expect(weekOf(new Date("2027-01-01T15:00:00Z"))).toEqual({
      start: "2026-12-28",
      end: "2027-01-03",
    });
  });

  it("a run summarizes the week before", () => {
    expect(previousWeek(new Date("2026-06-15T12:00:00Z")).start).toBe(
      "2026-06-08",
    );
  });
});

const base: Digest = {
  week: { start: "2026-06-08", end: "2026-06-14" },
  votes: [
    {
      id: 7,
      occurredOn: "2026-06-10",
      house: "senado",
      label: "PLP 55/2026",
      description: "Votação nominal do projeto de teste.",
      approved: true,
      yes: 58,
      no: 1,
      other: 0,
      ballotsChecked: true,
    },
  ],
  state: {
    name: "do Distrito Federal",
    ballots: [
      {
        voteId: 7,
        politicianId: 1,
        name: "Senadora Teste Um",
        party: "PL",
        option: "ausente",
        detail: "Licença saúde",
      },
      {
        voteId: 7,
        politicianId: 2,
        name: "Senador Teste Dois",
        party: null,
        option: null,
        detail: null,
      },
    ],
  },
  follows: [
    {
      voteId: 7,
      politicianId: 1,
      name: "Senadora Teste Um",
      party: "PL",
      option: "ausente",
      detail: "Licença saúde",
    },
    {
      voteId: 7,
      politicianId: 3,
      name: "Paulista Teste",
      party: "PT",
      option: "sim",
      detail: null,
    },
  ],
  links: {
    vote: (id) => `https://cobra.test/votacoes/${id}`,
    myData: "https://cobra.test/alertas/meus-dados",
    unsubscribe: "https://cobra.test/alertas/sair/abc",
  },
};

describe("digestText", () => {
  it("lists state and followed votes, each politician once", () => {
    const text = digestText(base)!;
    expect(text).toContain("Senadora Teste Um (PL): Ausente: Licença saúde");
    expect(text).toContain("Senador Teste Dois: Não registrou voto");
    expect(text).toContain(
      "Políticos que você segue:\n  - Paulista Teste (PT): Sim",
    );
    expect(text.match(/Senadora Teste Um/g)).toHaveLength(1);
    expect(text).toContain("Aprovado. Sim 58 · Não 1 · outros 0.");
    expect(text).toContain("https://cobra.test/votacoes/7");
    expect(text).toContain(
      "Saia com um clique: https://cobra.test/alertas/sair/abc",
    );
  });

  it("hides individual votes that do not match the official count", () => {
    const text = digestText({
      ...base,
      votes: [{ ...base.votes[0]!, ballotsChecked: false }],
    })!;
    expect(text).toContain("não conferem com o placar oficial");
    expect(text).not.toContain("Senadora Teste Um");
  });

  it("sends nothing in a week without relevant votes", () => {
    expect(digestText({ ...base, votes: [] })).toBeNull();
  });

  it("names the week in the subject", () => {
    expect(digestSubject(base.week)).toBe(
      "Cobra: o que aconteceu de 08/06 a 14/06",
    );
  });
});
