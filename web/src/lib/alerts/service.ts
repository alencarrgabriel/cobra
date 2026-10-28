import "server-only";

import type postgres from "postgres";

import { serverEnv } from "@/config/env";
import { MAP_STATES } from "@/lib/geo/br-map";
import { siteUrl } from "@/lib/site";

import { CONSENT_VERSION } from "./consent";
import {
  decrypt,
  emailLookup,
  encrypt,
  newToken,
  normalizeEmail,
  readUnsubscribeToken,
  tokenHash,
  unsubscribeToken,
} from "./crypto";
import { alertsDb, alertsKeys } from "./db";
import { sendMail } from "./mail";

// Sign-up, confirmation, "Meus dados" and unsubscribe (change alertas-cadastro, design D3).
// Every request that could reveal whether an address is subscribed answers the same way.

/** A connection or a transaction. */
export type Db = postgres.Sql | postgres.TransactionSql;

export type Prefs = { uf: string | null; follows: number[] };
type Pending = {
  uf: string | null;
  follow: number | null;
  followsConsent: boolean;
};
type Action =
  | "cadastro"
  | "confirmacao"
  | "link_meus_dados"
  | "acesso"
  | "exportacao"
  | "correcao"
  | "deixou_de_seguir"
  | "descadastro"
  | "exclusao";

const PER_ADDRESS_PER_HOUR = 3;
const CONFIRM_HOURS = 48;
const MANAGE_HOURS = 1;

export const UF_OPTIONS = MAP_STATES.map((s) => ({
  code: s.code,
  uf: s.uf,
  name: s.name,
}));

export function ufName(code: string | null): string | null {
  const s = UF_OPTIONS.find((o) => o.code === code);
  return s ? `${s.name} (${s.uf})` : null;
}

export function isUfCode(code: string): boolean {
  return UF_OPTIONS.some((o) => o.code === code);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(email: string): boolean {
  const e = normalizeEmail(email);
  return e.length <= 254 && EMAIL.test(e);
}

export function seal(value: unknown): Buffer {
  return encrypt(alertsKeys(), JSON.stringify(value));
}

export function open<T>(data: Uint8Array): T {
  return JSON.parse(decrypt(alertsKeys(), data)) as T;
}

async function log(sql: Db, id: string, action: Action) {
  await sql`insert into alerts.access_log (subscription_id, action) values (${id}, ${action})`;
}

/** Alert e-mails in the last 24 h: sign-up and "Meus dados" links plus weekly summaries. */
export async function emailsToday(sql: Db): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    select
      (select count(*)::int from alerts.access_log
        where action in ('cadastro', 'link_meus_dados')
          and at > now() - interval '1 day')
      + (select count(*)::int from alerts.deliveries
        where status = 'enviado' and sent_at > now() - interval '1 day') as n`;
  return row!.n;
}

/** Below the per-address and daily limits (design D3). */
async function canSend(sql: Db, id: string): Promise<boolean> {
  const [row] = await sql<{ address: number }[]>`
    select count(*)::int as address from alerts.links
    where subscription_id = ${id} and created_at > now() - interval '1 hour'`;
  return (
    row!.address < PER_ADDRESS_PER_HOUR &&
    (await emailsToday(sql)) < serverEnv().ALERTS_DAILY_CAP
  );
}

async function politicianName(id: number): Promise<string | null> {
  const [row] = await alertsDb()<{ name: string }[]>`
    select parliamentary_name as name from core.politicians where id = ${id}`;
  return row?.name ?? null;
}

export async function politicianExists(id: number): Promise<boolean> {
  return (await politicianName(id)) !== null;
}

function link(path: string): string {
  return new URL(path, siteUrl()).toString();
}

const FOOTER =
  "\n\nSe não foi você que pediu, ignore esta mensagem: nada muda sem a sua confirmação.\n\nCobra · dados públicos explicados · " +
  "Privacidade: ";

/** Sign-up or a new follow: always ends silently, whatever happened (design D3). */
export async function requestSignup(input: {
  email: string;
  uf: string | null;
  follow: number | null;
  followsConsent: boolean;
}): Promise<void> {
  const sql = alertsDb();
  const keys = alertsKeys();
  const email = normalizeEmail(input.email);
  const lookup = emailLookup(keys, email);
  const [row] = await sql<{ id: string }[]>`
    insert into alerts.subscriptions (email_lookup, email_enc, prefs_enc)
    values (${lookup}, ${encrypt(keys, email)},
      ${seal({ uf: null, follows: [] } satisfies Prefs)})
    on conflict (email_lookup) do update set email_lookup = excluded.email_lookup
    returning id`;
  const id = row!.id;
  if (!(await canSend(sql, id))) return;
  const { token, hash } = newToken();
  const pending: Pending = {
    uf: input.uf,
    follow: input.follow,
    followsConsent: input.followsConsent,
  };
  await sql`
    insert into alerts.links (token_hash, subscription_id, purpose, payload_enc, expires_at)
    values (${hash}, ${id}, 'confirmar', ${seal(pending)},
      now() + make_interval(hours => ${CONFIRM_HOURS}))`;
  await log(sql, id, "cadastro");
  const who = input.follow ? await politicianName(input.follow) : null;
  await sendMail({
    to: email,
    subject: who
      ? `Confirme que quer seguir ${who} no Cobra`
      : "Confirme seu cadastro no Cobra",
    text:
      (who
        ? `Para seguir ${who} e receber o resumo semanal do Cobra, confirme neste link (vale por 48 horas):`
        : "Para receber o resumo semanal do Cobra, confirme neste link (vale por 48 horas):") +
      `\n\n${link(`/alertas/confirmar/${token}`)}` +
      FOOTER +
      link("/privacidade"),
    idempotencyKey: hash.toString("hex"),
  });
}

type LinkRow = {
  subscription_id: string;
  payload_enc: Uint8Array | null;
};

async function findLink(
  sql: Db,
  token: string,
  purpose: "confirmar" | "meus_dados",
): Promise<LinkRow | null> {
  if (!/^[\w-]{43}$/.test(token)) return null;
  const [row] = await sql<LinkRow[]>`
    select subscription_id, payload_enc from alerts.links
    where token_hash = ${tokenHash(token)} and purpose = ${purpose}
      and expires_at > now()
      and (purpose = 'meus_dados' or used_at is null)`;
  return row ?? null;
}

export type Confirmation = {
  ufName: string | null;
  follow: { id: number; name: string } | null;
};

/** What confirming will do, without doing it (mail scanners open links on their own). */
export async function describeConfirmation(
  token: string,
): Promise<Confirmation | null> {
  const row = await findLink(alertsDb(), token, "confirmar");
  if (!row?.payload_enc) return null;
  const p = open<Pending>(row.payload_enc);
  const name = p.follow ? await politicianName(p.follow) : null;
  return {
    ufName: ufName(p.uf),
    follow: p.follow && name ? { id: p.follow, name } : null,
  };
}

/** Applies a confirmation link once: activates, records consents, merges the follow. */
export async function confirm(token: string): Promise<boolean> {
  return alertsDb().begin(async (sql) => {
    if (!/^[\w-]{43}$/.test(token)) return false;
    const [row] = await sql<LinkRow[]>`
      update alerts.links set used_at = now()
      where token_hash = ${tokenHash(token)} and purpose = 'confirmar'
        and used_at is null and expires_at > now()
      returning subscription_id, payload_enc`;
    if (!row?.payload_enc) return false;
    const p = open<Pending>(row.payload_enc);
    const [sub] = await sql<{ prefs_enc: Uint8Array }[]>`
      select prefs_enc from alerts.subscriptions where id = ${row.subscription_id} for update`;
    const prefs = open<Prefs>(sub!.prefs_enc);
    const follows =
      p.follow && p.followsConsent && !prefs.follows.includes(p.follow)
        ? [...prefs.follows, p.follow]
        : prefs.follows;
    await sql`
      update alerts.subscriptions set
        status = 'ativa',
        email_consent_version = ${CONSENT_VERSION},
        email_consent_at = now(),
        follows_consent_version = case when ${p.followsConsent} then ${CONSENT_VERSION}
          else follows_consent_version end,
        follows_consent_at = case when ${p.followsConsent} then now()
          else follows_consent_at end,
        prefs_enc = ${seal({ uf: p.uf ?? prefs.uf, follows } satisfies Prefs)}
      where id = ${row.subscription_id}`;
    await log(sql, row.subscription_id, "confirmacao");
    return true;
  });
}

/** Sends a "Meus dados" link if the address is subscribed; silent either way. */
export async function requestManageLink(input: string): Promise<void> {
  const sql = alertsDb();
  const email = normalizeEmail(input);
  const [row] = await sql<{ id: string }[]>`
    select id from alerts.subscriptions
    where email_lookup = ${emailLookup(alertsKeys(), email)}`;
  if (!row || !(await canSend(sql, row.id))) return;
  const { token, hash } = newToken();
  await sql`
    insert into alerts.links (token_hash, subscription_id, purpose, expires_at)
    values (${hash}, ${row.id}, 'meus_dados', now() + make_interval(hours => ${MANAGE_HOURS}))`;
  await log(sql, row.id, "link_meus_dados");
  await sendMail({
    to: email,
    subject: "Seus dados no Cobra",
    text:
      "Para ver, baixar, corrigir ou apagar seus dados no Cobra, abra este link (vale por 1 hora):" +
      `\n\n${link(`/alertas/meus-dados/${token}`)}` +
      FOOTER +
      link("/privacidade"),
    idempotencyKey: hash.toString("hex"),
  });
}

export type MyData = {
  email: string;
  status: "pendente" | "ativa" | "cancelada";
  uf: string | null;
  ufName: string | null;
  follows: { id: number; name: string }[];
  createdAt: string;
  emailConsent: { version: string; at: string } | null;
  followsConsent: { version: string; at: string } | null;
  /** Weekly summaries (change resumo-semanal), newest first. */
  deliveries: {
    weekStart: string;
    sentAt: string;
    status: "enviado" | "falhou";
    voteIds: number[];
  }[];
};

type SubRow = {
  id: string;
  email_enc: Uint8Array;
  prefs_enc: Uint8Array;
  status: MyData["status"];
  created_at: Date;
  email_consent_version: string | null;
  email_consent_at: Date | null;
  follows_consent_version: string | null;
  follows_consent_at: Date | null;
};

async function subscriptionOf(sql: Db, token: string): Promise<SubRow | null> {
  const row = await findLink(sql, token, "meus_dados");
  if (!row) return null;
  const [sub] = await sql<SubRow[]>`
    select id, email_enc, prefs_enc, status, created_at, email_consent_version,
      email_consent_at, follows_consent_version, follows_consent_at
    from alerts.subscriptions where id = ${row.subscription_id}`;
  return sub ?? null;
}

async function toMyData(sub: SubRow): Promise<MyData> {
  const prefs = open<Prefs>(sub.prefs_enc);
  const names = prefs.follows.length
    ? await alertsDb()<{ id: number; name: string }[]>`
        select id::int, parliamentary_name as name from core.politicians
        where id = any(${prefs.follows}) order by parliamentary_name collate "und-x-icu"`
    : [];
  const deliveries = await alertsDb()<
    {
      week_start: string;
      sent_at: Date;
      status: "enviado" | "falhou";
      vote_ids: string[];
    }[]
  >`
    select week_start::text, sent_at, status, vote_ids::text[]
    from alerts.deliveries where subscription_id = ${sub.id}
    order by week_start desc`;
  const consent = (v: string | null, at: Date | null) =>
    v && at ? { version: v, at: at.toISOString() } : null;
  return {
    email: decrypt(alertsKeys(), sub.email_enc),
    status: sub.status,
    uf: prefs.uf,
    ufName: ufName(prefs.uf),
    follows: names,
    createdAt: sub.created_at.toISOString(),
    emailConsent: consent(sub.email_consent_version, sub.email_consent_at),
    followsConsent: consent(
      sub.follows_consent_version,
      sub.follows_consent_at,
    ),
    deliveries: deliveries.map((d) => ({
      weekStart: d.week_start,
      sentAt: d.sent_at.toISOString(),
      status: d.status,
      voteIds: d.vote_ids.map(Number),
    })),
  };
}

/** The data behind a "Meus dados" link, logging the access; null when the link is not valid. */
export async function myData(
  token: string,
  action: "acesso" | "exportacao" = "acesso",
): Promise<(MyData & { unsubscribe: string }) | null> {
  const sql = alertsDb();
  const sub = await subscriptionOf(sql, token);
  if (!sub) return null;
  await log(sql, sub.id, action);
  return {
    ...(await toMyData(sub)),
    unsubscribe: unsubscribeToken(alertsKeys(), sub.id),
  };
}

async function change(
  token: string,
  action: Action,
  apply: (sql: Db, sub: SubRow, prefs: Prefs) => Promise<void>,
): Promise<boolean> {
  return alertsDb().begin(async (sql) => {
    const sub = await subscriptionOf(sql, token);
    if (!sub) return false;
    await apply(sql, sub, open<Prefs>(sub.prefs_enc));
    await log(sql, sub.id, action);
    return true;
  });
}

export function setUf(token: string, uf: string | null): Promise<boolean> {
  return change(token, "correcao", async (sql, sub, prefs) => {
    await sql`update alerts.subscriptions
      set prefs_enc = ${seal({ ...prefs, uf } satisfies Prefs)} where id = ${sub.id}`;
  });
}

export function unfollow(token: string, id: number): Promise<boolean> {
  return change(token, "deixou_de_seguir", async (sql, sub, prefs) => {
    const follows = prefs.follows.filter((f) => f !== id);
    await sql`update alerts.subscriptions
      set prefs_enc = ${seal({ ...prefs, follows } satisfies Prefs)} where id = ${sub.id}`;
  });
}

export function cancelByLink(token: string): Promise<boolean> {
  return change(token, "descadastro", async (sql, sub) => {
    await sql`update alerts.subscriptions set status = 'cancelada' where id = ${sub.id}`;
  });
}

/** Deletes the subscription and its links; only the log entry of the deletion remains. */
export function erase(token: string): Promise<boolean> {
  return change(token, "exclusao", async (sql, sub) => {
    await sql`delete from alerts.subscriptions where id = ${sub.id}`;
  });
}

/** One-click unsubscribe by the permanent token (design D1). */
export async function unsubscribe(token: string): Promise<boolean> {
  const id = readUnsubscribeToken(alertsKeys(), token);
  if (!id) return false;
  return alertsDb().begin(async (sql) => {
    const rows = await sql`
      update alerts.subscriptions set status = 'cancelada' where id = ${id} returning id`;
    if (rows.length) await log(sql, id, "descadastro");
    return true;
  });
}

export function isUnsubscribeToken(token: string): boolean {
  return readUnsubscribeToken(alertsKeys(), token) !== null;
}
