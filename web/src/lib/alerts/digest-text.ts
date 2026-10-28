import { HOUSE_NAME, optionText } from "@/lib/votes/options";
import { formatDate, formatInteger } from "@/lib/works/format";

// Weekly summary: the week and the plain-text message (change resumo-semanal, design D2).
// Pure, so it is tested without a database.

export type Week = { start: string; end: string };

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Monday to Sunday containing `date`, in Brasília time (UTC-3, no daylight saving). */
export function weekOf(date: Date): Week {
  const local = date.getTime() - 3 * 3_600_000;
  const day = Math.floor(local / DAY) * DAY;
  const weekday = (new Date(day).getUTCDay() + 6) % 7; // Monday = 0
  const start = day - weekday * DAY;
  return { start: iso(start), end: iso(start + 6 * DAY) };
}

/** The week before the one containing `date`: what a run on `date` summarizes. */
export function previousWeek(date: Date): Week {
  return weekOf(new Date(date.getTime() - 7 * DAY));
}

export type DigestVote = {
  id: number;
  occurredOn: string;
  house: string;
  label: string | null;
  description: string;
  approved: boolean | null;
  yes: number;
  no: number;
  other: number;
  ballotsChecked: boolean;
};

export type DigestBallot = {
  voteId: number;
  politicianId: number;
  name: string;
  party: string | null;
  option: string | null;
  detail: string | null;
};

export type Digest = {
  week: Week;
  votes: DigestVote[];
  /** Representatives of the subscriber's state, by vote. */
  state: { name: string; ballots: DigestBallot[] } | null;
  /** Followed politicians, by vote. */
  follows: DigestBallot[];
  links: {
    vote: (id: number) => string;
    myData: string;
    unsubscribe: string;
  };
};

const short = (d: string) => formatDate(d).slice(0, 5);

function result(v: DigestVote): string {
  const outcome =
    v.approved === true
      ? "Aprovado. "
      : v.approved === false
        ? "Rejeitado. "
        : "";
  return `${outcome}Sim ${formatInteger(v.yes)} · Não ${formatInteger(v.no)} · outros ${formatInteger(v.other)}.`;
}

const line = (b: DigestBallot) =>
  `  - ${b.name}${b.party ? ` (${b.party})` : ""}: ${optionText(b.option, b.detail)}`;

export function digestSubject(week: Week): string {
  return `Cobra: o que aconteceu de ${short(week.start)} a ${short(week.end)}`;
}

/** The message, or null when the week had no relevant vote (no e-mail then). */
export function digestText(d: Digest): string | null {
  if (d.votes.length === 0) return null;
  const parts = [
    `Votações relevantes de ${formatDate(d.week.start)} a ${formatDate(d.week.end)} na Câmara e no Senado, da mais recente para a mais antiga.`,
  ];
  for (const v of d.votes) {
    const block = [
      `${formatDate(v.occurredOn)} · ${HOUSE_NAME[v.house] ?? v.house}`,
      v.label ?? "Votação",
      v.description,
      result(v),
    ];
    const state = d.state?.ballots.filter((b) => b.voteId === v.id) ?? [];
    const shown = new Set(state.map((b) => b.politicianId));
    const follows = d.follows.filter(
      (b) => b.voteId === v.id && !shown.has(b.politicianId),
    );
    if (!v.ballotsChecked) {
      block.push(
        "Os votos individuais desta votação não conferem com o placar oficial e não são mostrados.",
      );
    } else {
      if (state.length) {
        block.push(`Representantes ${d.state!.name}:`, ...state.map(line));
      }
      if (follows.length) {
        block.push("Políticos que você segue:", ...follows.map(line));
      }
    }
    block.push(`Ver a votação: ${d.links.vote(v.id)}`);
    parts.push(block.join("\n"));
  }
  parts.push(
    [
      "Fonte: dados abertos da Câmara dos Deputados e do Senado Federal, coletados pelo Cobra.",
      "Uma votação é relevante por critério objetivo: Governo e Oposição divergiram, o placar foi disputado ou o tipo de matéria.",
      `Ver ou apagar seus dados: ${d.links.myData}`,
      `Não quer mais receber? Saia com um clique: ${d.links.unsubscribe}`,
    ].join("\n"),
  );
  return parts.join("\n\n");
}
