import "server-only";

import { serverEnv } from "@/config/env";
import { logger } from "@/lib/logger";

import { alertsDb } from "./db";

// Delivery of alert messages (change alertas-cadastro, design D4). Resend API checked on
// 2026-10-27 (resend.com/docs/api-reference/emails/send-email): POST /emails with a Bearer
// key, `Idempotency-Key` valid for 24 h, 10 requests per second.

const RESEND_URL = "https://api.resend.com/emails";

export type Mail = {
  to: string;
  subject: string;
  text: string;
  /** Same key for the same message: a retried request is not sent twice. */
  idempotencyKey: string;
  headers?: Record<string, string>;
};

/** Sends, or writes to alerts.outbox_local without a Resend key outside production. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    if (env.APP_ENV === "production") return false;
    await alertsDb()`
      insert into alerts.outbox_local (recipient, subject, body)
      values (${mail.to}, ${mail.subject}, ${mail.text})`;
    return true;
  }
  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": mail.idempotencyKey,
      },
      body: JSON.stringify({
        from: env.ALERTS_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        headers: mail.headers,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return true;
    (await logger()).error("alert e-mail rejected", {
      status: response.status,
    });
  } catch (error) {
    (await logger()).error("alert e-mail failed", { error: String(error) });
  }
  return false;
}
