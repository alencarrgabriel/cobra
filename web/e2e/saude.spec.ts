import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { E2E_CRON_SECRET, e2eUrl } from "./db/setup";

// Scenarios from openspec change `saude-integracoes`: the daily maintenance alerts the team
// once a day when a source is failing or late. The panel view is in painel.spec.ts.

const sql = postgres(e2eUrl(), { max: 1 });
test.afterAll(() => sql.end());

test("manutenção alerta a equipe uma vez por dia sobre fonte com falha", async ({
  request,
}) => {
  await sql`insert into ops.runs (source, started_at, finished_at, status, jobs_done, jobs_failed)
    values ('senado', now() - interval '1 hour', now() - interval '50 minutes', 'failed', 3, 2)`;
  await sql`delete from ops.alerts_sent`;
  await sql`delete from alerts.outbox_local where recipient = 'equipe@cobra.test'`;

  const auth = { Authorization: `Bearer ${E2E_CRON_SECRET}` };
  for (let i = 0; i < 2; i++) {
    const response = await request.post("/api/manutencao/diaria", {
      headers: auth,
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      integracoesComProblema: string[];
    };
    expect(body.integracoesComProblema).toContain("senado");
  }

  const sent = await sql<{ subject: string; body: string }[]>`
    select subject, body from alerts.outbox_local where recipient = 'equipe@cobra.test'`;
  expect(sent).toHaveLength(1);
  expect(sent[0]!.subject).toMatch(/precisa(m)? de atenção$/);
  expect(sent[0]!.body).toContain("- Senado Federal: Com falha");
  expect(sent[0]!.body).toMatch(/\/painel\/saude/);
});
