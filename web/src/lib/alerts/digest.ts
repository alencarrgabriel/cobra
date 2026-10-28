import "server-only";

import { serverEnv } from "@/config/env";
import { withDb } from "@/lib/db";
import { FLAGS } from "@/lib/geo/flags";
import { siteUrl } from "@/lib/site";
import { getPlaceVotes } from "@/lib/votes/queries";

import { decrypt, unsubscribeToken } from "./crypto";
import { alertsDb, alertsKeys } from "./db";
import {
  type DigestBallot,
  digestSubject,
  digestText,
  type DigestVote,
  type Week,
} from "./digest-text";
import { sendMail } from "./mail";
import { emailsToday, open, type Prefs, UF_OPTIONS } from "./service";

// Weekly summary run (change resumo-semanal, design D1 to D4). Runs every day: each run sends
// the previous week to whoever has not received it yet, and stops at the daily limit.

const MAX_VOTES = 15;
/** Below Resend's 10 requests per second. */
const GAP_MS = 125;

export type RunReport = {
  week: Week;
  votes: number;
  sent: number;
  noEvents: number;
  failed: number;
  deferred: number;
};

async function weekVotes(week: Week): Promise<DigestVote[]> {
  const rows = await withDb(
    (sql) => sql<
      {
        id: string;
        occurred_on: string;
        house: string;
        label: string | null;
        description: string;
        approved: boolean | null;
        yes: number;
        no: number;
        other: number;
        quality_notes: string[];
      }[]
    >`
      select v.id::text, v.occurred_on::text, h.slug as house, v.proposition_label as label,
             v.description, v.approved, v.yes, v.no, v.other, v.quality_notes
      from core.events e
      join core.votes v on v.id = e.vote_id
      join core.legislative_houses h on h.id = v.house_id
      where e.kind = 'votacao_relevante'
        and v.occurred_on between ${week.start}::date and ${week.end}::date
      order by v.occurred_on desc, v.registered_at desc nulls last, v.id desc
      limit ${MAX_VOTES}`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    occurredOn: r.occurred_on,
    house: r.house,
    label: r.label,
    description: r.description,
    approved: r.approved,
    yes: r.yes,
    no: r.no,
    other: r.other,
    ballotsChecked: r.quality_notes.length === 0,
  }));
}

/** Ballots of followed politicians; "Não registrou voto" when in office without a ballot. */
async function followedBallots(
  politicians: number[],
  votes: number[],
): Promise<DigestBallot[]> {
  if (!politicians.length || !votes.length) return [];
  const rows = await withDb(
    (sql) => sql<
      {
        vote_id: string;
        politician_id: string;
        name: string;
        party: string | null;
        option: string | null;
        detail: string | null;
      }[]
    >`
      select v.id::text as vote_id, p.id::text as politician_id, p.parliamentary_name as name,
             b.party_acronym as party, b.option, b.option_detail as detail
      from core.votes v
      join core.politicians p on p.id = any(${politicians})
      left join core.vote_ballots b on b.vote_id = v.id and b.politician_id = p.id
      where v.id = any(${votes}) and v.nominal and v.quality_notes = '{}'
        and (b.vote_id is not null or exists (
          select 1 from core.mandates m
          where m.politician_id = p.id and m.house_id = v.house_id
            and m.started_on <= v.occurred_on
            and (m.ended_on is null or m.ended_on >= v.occurred_on)))
      order by v.id, p.parliamentary_name collate "und-x-icu"`,
  );
  return rows.map((r) => ({
    voteId: Number(r.vote_id),
    politicianId: Number(r.politician_id),
    name: r.name,
    party: r.party,
    option: r.option,
    detail: r.detail,
  }));
}

/** "do Distrito Federal", "de São Paulo". */
function ofState(code: string): string | null {
  const uf = UF_OPTIONS.find((o) => o.code === code)?.uf;
  const flag = uf ? FLAGS[uf] : undefined;
  return flag ? `${flag.preposition} ${flag.name}` : null;
}

export async function runWeeklyDigest(week: Week): Promise<RunReport> {
  const sql = alertsDb();
  const keys = alertsKeys();
  const votes = await weekVotes(week);
  const report: RunReport = {
    week,
    votes: votes.length,
    sent: 0,
    noEvents: 0,
    failed: 0,
    deferred: 0,
  };
  const pending = await sql<
    { id: string; email_enc: Uint8Array; prefs_enc: Uint8Array }[]
  >`
    select s.id, s.email_enc, s.prefs_enc from alerts.subscriptions s
    where s.status = 'ativa'
      and not exists (select 1 from alerts.deliveries d
        where d.subscription_id = s.id and d.week_start = ${week.start}::date
          and d.status = 'enviado')
    order by s.created_at`;
  if (votes.length === 0) {
    report.noEvents = pending.length;
    return report;
  }
  const voteIds = votes.map((v) => v.id);
  const site = siteUrl();
  const url = (path: string) => new URL(path, site).toString();
  let budget = serverEnv().ALERTS_DAILY_CAP - (await emailsToday(sql));
  for (const sub of pending) {
    if (budget <= 0) {
      report.deferred++;
      continue;
    }
    const prefs = open<Prefs>(sub.prefs_enc);
    const stateName = prefs.uf ? ofState(prefs.uf) : null;
    const state =
      prefs.uf && stateName
        ? { name: stateName, ballots: await getPlaceVotes(prefs.uf, voteIds) }
        : null;
    const token = unsubscribeToken(keys, sub.id);
    const text = digestText({
      week,
      votes,
      state,
      follows: await followedBallots(prefs.follows, voteIds),
      links: {
        vote: (id) => url(`/votacoes/${id}`),
        myData: url("/alertas/meus-dados"),
        unsubscribe: url(`/alertas/sair/${token}`),
      },
    })!;
    const ok = await sendMail({
      to: decrypt(keys, sub.email_enc),
      subject: digestSubject(week),
      text,
      idempotencyKey: `${sub.id}:${week.start}`,
      headers: {
        "List-Unsubscribe": `<${url(`/alertas/sair/${token}/um-clique`)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    await sql`
      insert into alerts.deliveries (subscription_id, week_start, vote_ids, status)
      values (${sub.id}, ${week.start}::date, ${voteIds}, ${ok ? "enviado" : "falhou"})
      on conflict (subscription_id, week_start) do update
        set vote_ids = excluded.vote_ids, status = excluded.status, sent_at = now()`;
    if (ok) {
      report.sent++;
      budget--;
    } else {
      report.failed++;
    }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  return report;
}
