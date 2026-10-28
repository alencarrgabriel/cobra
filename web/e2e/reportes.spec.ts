import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

import { E2E_CRON_SECRET, e2eUrl } from "./db/setup";

// Scenarios from openspec change `reporte-de-erro`, against e2e/db/seed.sql. The panel triage
// is in painel.spec.ts (it needs the local Supabase Auth).

const sql = postgres(e2eUrl(), { max: 1 });
test.afterAll(() => sql.end());

const DESCRIPTION =
  "O valor previsto desta obra é diferente do que está no Obrasgov.";

test("reporte de erro numa obra recebe protocolo e prazo e entra na fila pública sem a descrição", async ({
  page,
}) => {
  await page.goto("/obras/900001.53-01");
  await page.getByRole("link", { name: "Reportar erro nesta página" }).click();
  await expect(page.getByTestId("pagina-reportada")).toHaveText(
    "/obras/900001.53-01",
    { timeout: 15_000 },
  );
  await page.getByLabel("O que está errado").fill(DESCRIPTION);
  await page
    .getByLabel("E-mail para resposta (opcional)")
    .fill(`reporte-${Date.now()}@exemplo.org`);
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  const protocol = page.getByTestId("protocolo");
  await expect(protocol).toContainText(/Protocolo nº \d+\. Respondemos até/, {
    timeout: 15_000,
  });
  const id = /nº (\d+)/.exec((await protocol.textContent())!)![1]!;

  await page.goto("/correcoes");
  const item = page
    .getByTestId("reporte-publico")
    .filter({ hasText: `Protocolo nº ${id}` });
  await expect(item).toContainText("/obras/900001.53-01");
  await expect(item.getByTestId("situacao")).toContainText(
    /Recebido \(no prazo até \d{2}\/\d{2}\/\d{4}\)/,
  );
  await expect(page.getByTestId("fila-publica")).not.toContainText(DESCRIPTION);
  await expect(page.getByTestId("fila-publica")).not.toContainText(
    "@exemplo.org",
  );

  const [row] = await sql<{ email_enc: Buffer }[]>`
    select email_enc from reports.reports where id = ${Number(id)}`;
  expect(row!.email_enc.toString("latin1")).not.toContain("@exemplo.org");
});

test("descrição curta é recusada sem gravar", async ({ page }) => {
  const [{ n: before }] = await sql<{ n: number }[]>`
    select count(*)::int as n from reports.reports`;
  await page.goto("/reportar");
  // Bypass the browser's minlength check, as a script would.
  await page.getByLabel("O que está errado").evaluate((el) => {
    el.removeAttribute("minlength");
    el.removeAttribute("required");
  });
  await page.getByLabel("O que está errado").fill("errado");
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByTestId("erro-reporte")).toContainText(
    "pelo menos 20",
    { timeout: 15_000 },
  );
  const [{ n: after }] = await sql<{ n: number }[]>`
    select count(*)::int as n from reports.reports`;
  expect(after).toBe(before);
});

test("“É você nesta página?” abre a contestação do perfil", async ({
  page,
}) => {
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-senado")
    .getByRole("button", { name: /Senadora Teste Um/ })
    .click();
  await page.getByRole("link", { name: "Ver perfil completo" }).click();
  await page.getByTestId("e-voce").click();
  await expect(page.getByTestId("pagina-reportada")).toHaveText(
    /^\/politicos\/\d+$/,
    { timeout: 15_000 },
  );
  await expect(
    page.getByLabel("Sou a pessoa desta página e quero contestar"),
  ).toBeChecked();
  await expect(page.getByText("direito de resposta")).toBeVisible();
});

test("endereço privado não vira página reportada", async ({ page }) => {
  await page.goto("/reportar?pagina=/alertas/meus-dados/segredo");
  await expect(page.getByText("Página: o Cobra em geral")).toBeVisible({
    timeout: 15_000,
  });
});

test("protocolo inexistente responde 404", async ({ page }) => {
  for (const path of ["/correcoes/999999999", "/correcoes/abc"]) {
    expect((await page.goto(path))?.status()).toBe(404);
  }
});

test("manutenção apaga o e-mail 90 dias depois do fechamento", async ({
  request,
}) => {
  const [{ id }] = await sql<{ id: number }[]>`
    insert into reports.reports (page_path, kind, description, email_enc, due_on, status,
      public_note, closed_at, closed_by)
    values ('/', 'erro', ${DESCRIPTION}, '\\x01', '2026-01-08', 'corrigido', ${DESCRIPTION},
      now() - interval '91 days', 'editora')
    returning id::int`;
  expect((await request.get("/api/manutencao/diaria")).status()).toBe(404);
  const response = await request.post("/api/manutencao/diaria", {
    headers: { Authorization: `Bearer ${E2E_CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  const [row] = await sql<{ email_enc: Buffer | null; purged: boolean }[]>`
    select email_enc, email_purged_at is not null as purged
    from reports.reports where id = ${id}`;
  expect(row).toEqual({ email_enc: null, purged: true });
});

test("reportar e correções sem violações de acessibilidade", async ({
  page,
}) => {
  for (const path of ["/reportar?pagina=/votacoes&tipo=erro", "/correcoes"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);
  }
});
