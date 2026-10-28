import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { serverEnv } from "@/config/env";
import { decrypt, encrypt } from "@/lib/alerts/crypto";
import { alertsKeys } from "@/lib/alerts/db";
import { sendMail } from "@/lib/alerts/mail";
import { type DbResult, tryDb, unwrap } from "@/lib/db";
import { editorDb } from "@/lib/editorial/db";
import { siteUrl } from "@/lib/site";

import { reportsDb } from "./db";
import {
  addBusinessDays,
  isClosed,
  PURGE_DAYS,
  RESPONSE_BUSINESS_DAYS,
  type ReportKind,
  type ReportStatus,
  STATUS_LABEL,
  todayInBrasilia,
} from "./rules";

// Error reports (change reporte-de-erro): the form inserts through cobra_reports, the public
// queue reads core.public_reports, and editors triage through cobra_editor.

const DAILY_LIMIT = 200;

export type PublicReport = {
  id: number;
  pagePath: string;
  kind: ReportKind;
  status: ReportStatus;
  publicNote: string | null;
  createdAt: string;
  dueOn: string;
  closedAt: string | null;
};

type PublicRow = {
  id: string;
  page_path: string;
  kind: ReportKind;
  status: ReportStatus;
  public_note: string | null;
  created_at: Date;
  due_on: string;
  closed_at: Date | null;
};

const toPublic = (r: PublicRow): PublicReport => ({
  id: Number(r.id),
  pagePath: r.page_path,
  kind: r.kind,
  status: r.status,
  publicNote: r.public_note,
  createdAt: r.created_at.toISOString(),
  dueOn: r.due_on,
  closedAt: r.closed_at?.toISOString() ?? null,
});

/** "ok" with the protocol and deadline, or "limit" when the day's limit was reached. */
export async function submitReport(input: {
  pagePath: string;
  kind: ReportKind;
  description: string;
  email: string | null;
}): Promise<{ id: number; dueOn: string } | "limit"> {
  const sql = reportsDb();
  const [today] = await sql<{ n: number }[]>`
    select count(*)::int as n from reports.reports
    where created_at > now() - interval '1 day'`;
  if (today!.n >= DAILY_LIMIT) return "limit";
  const dueOn = addBusinessDays(todayInBrasilia(), RESPONSE_BUSINESS_DAYS);
  const email =
    input.email && serverEnv().ALERTS_SECRET
      ? encrypt(alertsKeys(), input.email)
      : null;
  const [row] = await sql<{ id: string }[]>`
    insert into reports.reports (page_path, kind, description, email_enc, due_on)
    values (${input.pagePath}, ${input.kind}, ${input.description}, ${email}, ${dueOn})
    returning id`;
  return { id: Number(row!.id), dueOn };
}

const PAGE = 30;

async function cachedQueue(page: number): Promise<
  DbResult<{
    items: PublicReport[];
    more: boolean;
    open: number;
    closed: number;
  }>
> {
  "use cache";
  cacheTag("reports");
  const result = await tryDb(async (sql) => {
    const [rows, [counts]] = await Promise.all([
      sql<PublicRow[]>`
        select id, page_path, kind, status, public_note, created_at, due_on::text as due_on, closed_at from core.public_reports order by id desc
        limit ${PAGE + 1} offset ${(page - 1) * PAGE}`,
      sql<{ open: number; closed: number }[]>`
        select count(*) filter (where closed_at is null)::int as open,
               count(*) filter (where closed_at is not null)::int as closed
        from core.public_reports`,
    ]);
    return {
      items: rows.slice(0, PAGE).map(toPublic),
      more: rows.length > PAGE,
      open: counts!.open,
      closed: counts!.closed,
    };
  });
  if (result.ok) cacheLife("minutes");
  else cacheLife("seconds");
  return result;
}

export async function publicQueue(page: number) {
  return unwrap(await cachedQueue(page));
}

async function cachedReport(
  id: number,
): Promise<DbResult<PublicReport | null>> {
  "use cache";
  cacheTag("reports");
  const result = await tryDb(async (sql) => {
    const [row] = await sql<PublicRow[]>`
      select id, page_path, kind, status, public_note, created_at, due_on::text as due_on, closed_at from core.public_reports where id = ${id}`;
    return row ? toPublic(row) : null;
  });
  if (result.ok) cacheLife("minutes");
  else cacheLife("seconds");
  return result;
}

export async function publicReport(id: number): Promise<PublicReport | null> {
  return unwrap(await cachedReport(id));
}

// Panel (cobra_editor).

export type PanelReport = PublicReport & {
  description: string;
  hasEmail: boolean;
  emailPurged: boolean;
  closedBy: string | null;
  history: {
    at: string;
    editor: string;
    status: ReportStatus;
    publicNote: string | null;
    replied: boolean;
  }[];
};

export async function panelReports(): Promise<PublicReport[]> {
  const rows = await editorDb()<PublicRow[]>`
    select id, page_path, kind, status, public_note, created_at, due_on::text as due_on, closed_at
    from reports.reports
    where closed_at is null or closed_at > now() - interval '30 days'
    order by (closed_at is not null), due_on, id`;
  return rows.map(toPublic);
}

export async function panelReport(id: number): Promise<PanelReport | null> {
  const sql = editorDb();
  const [row] = await sql<
    (PublicRow & {
      description: string;
      has_email: boolean;
      email_purged_at: Date | null;
      closed_by: string | null;
    })[]
  >`
    select id, page_path, kind, status, public_note, created_at, due_on::text as due_on, closed_at,
           description, email_enc is not null as has_email, email_purged_at, closed_by
    from reports.reports where id = ${id}`;
  if (!row) return null;
  const history = await sql<
    {
      at: Date;
      editor: string;
      status: ReportStatus;
      public_note: string | null;
      replied: boolean;
    }[]
  >`select at, editor, status, public_note, replied from reports.history
    where report_id = ${id} order by id desc`;
  return {
    ...toPublic(row),
    description: row.description,
    hasEmail: row.has_email,
    emailPurged: row.email_purged_at !== null,
    closedBy: row.closed_by,
    history: history.map((h) => ({
      at: h.at.toISOString(),
      editor: h.editor,
      status: h.status,
      publicNote: h.public_note,
      replied: h.replied,
    })),
  };
}

/** Saves a triage step; with `reply`, e-mails the person (if they left an address). */
export async function triage(input: {
  id: number;
  editor: string;
  status: ReportStatus;
  publicNote: string | null;
  reply: string | null;
}): Promise<boolean> {
  const closed = isClosed(input.status);
  const email = await editorDb().begin(async (sql) => {
    const [row] = await sql<{ email_enc: Uint8Array | null }[]>`
      update reports.reports set
        status = ${input.status},
        public_note = ${input.publicNote},
        closed_at = case when ${closed} then coalesce(closed_at, now()) end,
        closed_by = case when ${closed} then ${input.editor} end
      where id = ${input.id}
      returning email_enc`;
    if (!row) return undefined;
    await sql`
      insert into reports.history (report_id, editor, status, public_note, replied)
      values (${input.id}, ${input.editor}, ${input.status}, ${input.publicNote},
        ${Boolean(input.reply && row.email_enc)})`;
    return row.email_enc;
  });
  if (email === undefined) return false;
  if (input.reply && email) {
    await sendMail({
      to: decrypt(alertsKeys(), email),
      subject: `Cobra: resposta ao reporte nº ${input.id}`,
      text: [
        input.reply,
        `Situação: ${STATUS_LABEL[input.status]}.`,
        input.publicNote ? `Nota pública: ${input.publicNote}` : null,
        `Acompanhe: ${new URL(`/correcoes/${input.id}`, siteUrl()).toString()}`,
        `Seu e-mail será apagado ${PURGE_DAYS} dias depois do fechamento deste reporte.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      idempotencyKey: `reporte-${input.id}-${Date.now()}`,
    });
  }
  return true;
}

/** Erases the e-mail of reports closed more than PURGE_DAYS ago (design D6). */
export async function purgeExpiredEmails(): Promise<number> {
  const rows = await editorDb()`
    update reports.reports set email_enc = null, email_purged_at = now()
    where email_enc is not null
      and closed_at < now() - make_interval(days => ${PURGE_DAYS})
    returning id`;
  return rows.length;
}
