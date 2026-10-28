import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";

import { deriveKeys, emailLookup } from "../src/lib/alerts/crypto";
import { E2E_ALERTS_SECRET, E2E_CRON_SECRET, e2eUrl } from "./db/setup";

// Scenarios from openspec change `resumo-semanal`, against e2e/db/seed.sql: the week of
// 08 to 14/06/2026 has relevant votes in both houses. Messages are read from
// alerts.outbox_local (no RESEND_API_KEY in tests).

const sql = postgres(e2eUrl(), { max: 1 });
test.afterAll(() => sql.end());
const keys = deriveKeys(E2E_ALERTS_SECRET);

const TRIGGER = "/api/alertas/resumo-semanal";
const auth = { Authorization: `Bearer ${E2E_CRON_SECRET}` };

let n = 0;
const address = () => `resumo-${Date.now()}-${n++}@exemplo.org`;

async function outbox(to: string) {
  return sql<
    { subject: string; body: string; headers: Record<string, string> | null }[]
  >`select subject, body, headers from alerts.outbox_local
    where recipient = ${to} order by id`;
}

async function lastLink(to: string): Promise<string> {
  const all = await outbox(to);
  const url = /https?:\/\/\S+\/alertas\/\S+/.exec(all.at(-1)!.body)![0];
  return new URL(url).pathname;
}

/** Signs up in the DF following Senadora Teste Um, and confirms. */
async function subscribe(page: Page, email: string) {
  const [{ id }] = await sql<{ id: number }[]>`
    select id::int from core.politicians where source_id = '9001' limit 1`;
  await page.goto(`/alertas?seguir=${id}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Estado (opcional)").selectOption({
    label: "Distrito Federal",
  });
  await page.getByLabel(/Quero receber por e-mail/).check();
  await page.getByLabel(/Autorizo o Cobra a guardar/).check();
  await page.getByRole("button", { name: /resumo/ }).click();
  await expect(page.getByTestId("enviado")).toBeVisible({ timeout: 15_000 });
  await page.goto(await lastLink(email));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("confirmado")).toBeVisible({ timeout: 15_000 });
}

test("sem o segredo, a rota de disparo não existe", async ({ request }) => {
  expect((await request.get(TRIGGER)).status()).toBe(404);
  expect(
    (
      await request.post(TRIGGER, {
        headers: { Authorization: "Bearer errado" },
      })
    ).status(),
  ).toBe(404);
});

test("resumo da semana com votos do estado e dos seguidos, uma vez só", async ({
  page,
  request,
}) => {
  const email = address();
  await subscribe(page, email);
  const cancelled = address();
  await subscribe(page, cancelled);
  await sql`update alerts.subscriptions set status = 'cancelada'
    where email_lookup = ${emailLookup(keys, cancelled)}`;

  const response = await request.get(`${TRIGGER}?semana=2026-06-10`, {
    headers: auth,
  });
  expect(response.status()).toBe(200);
  const report = (await response.json()) as {
    week: { start: string };
    votes: number;
    sent: number;
  };
  expect(report.week.start).toBe("2026-06-08");
  expect(report.votes).toBeGreaterThanOrEqual(2);
  expect(report.sent).toBeGreaterThanOrEqual(1);

  const digest = (await outbox(email)).filter((m) =>
    m.subject.startsWith("Cobra: o que aconteceu"),
  );
  expect(digest).toHaveLength(1);
  const { subject, body, headers } = digest[0]!;
  expect(subject).toBe("Cobra: o que aconteceu de 08/06 a 14/06");
  expect(body).toContain("Aprovado o projeto de teste.");
  expect(body).toContain("Representantes do Distrito Federal:");
  expect(body).toContain("Deputado Teste A (PL): Não");
  expect(body).toContain("Deputada Teste B: Não registrou voto");
  expect(body).toContain("Senadora Teste Um (PL): Ausente: Licença saúde");
  // Senadora Teste Um is both a DF senator and followed: listed once per vote.
  expect(body.match(/Senadora Teste Um/g)).toHaveLength(1);
  expect(body).toMatch(/\/votacoes\/\d+/);
  expect(body).toMatch(/Saia com um clique: \S+\/alertas\/sair\//);
  expect(headers!["List-Unsubscribe"]).toMatch(
    /^<https?:\/\/\S+\/alertas\/sair\/\S+\/um-clique>$/,
  );
  expect(headers!["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  expect(
    (await outbox(cancelled)).filter((m) => m.subject.startsWith("Cobra:")),
  ).toHaveLength(0);

  // A second run of the same week does not send again.
  await request.post(`${TRIGGER}?semana=2026-06-10`, { headers: auth });
  expect(
    (await outbox(email)).filter((m) => m.subject.startsWith("Cobra:")),
  ).toHaveLength(1);

  // The unsubscribe link of the summary works.
  const exit = new URL(/Saia com um clique: (\S+)/.exec(body)![1]!).pathname;
  expect((await request.post(`${exit}/um-clique`)).status()).toBe(200);

  // Meus dados shows the summary.
  await page.goto("/alertas/meus-dados");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Enviar o link" }).click();
  await expect(page.getByTestId("enviado")).toBeVisible({ timeout: 15_000 });
  await page.goto(await lastLink(email));
  await expect(page.getByTestId("envios")).toContainText(
    "Semana de 08/06/2026: enviado em",
  );
});

test("semana sem votação relevante não gera mensagem", async ({
  page,
  request,
}) => {
  const email = address();
  await subscribe(page, email);
  const response = await request.get(`${TRIGGER}?semana=2026-01-14`, {
    headers: auth,
  });
  const report = (await response.json()) as { votes: number; sent: number };
  expect(report.votes).toBe(0);
  expect(report.sent).toBe(0);
  expect(
    (await outbox(email)).filter((m) => m.subject.startsWith("Cobra:")),
  ).toHaveLength(0);
});
