import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";

import {
  deriveKeys,
  emailLookup,
  unsubscribeToken,
} from "../src/lib/alerts/crypto";
import { E2E_ALERTS_SECRET, e2eUrl } from "./db/setup";

// Scenarios from openspec change `alertas-cadastro`, against e2e/db/seed.sql. Without
// RESEND_API_KEY the site writes messages to alerts.outbox_local; links are read from there.

const sql = postgres(e2eUrl(), { max: 1 });
test.afterAll(() => sql.end());

let n = 0;
const address = () => `pessoa-${Date.now()}-${n++}@exemplo.org`;

async function messages(to: string) {
  return sql<{ subject: string; body: string }[]>`
    select subject, body from alerts.outbox_local where recipient = ${to} order by id`;
}

/** Path of the last link sent to the address. */
async function lastLink(to: string): Promise<string> {
  const all = await messages(to);
  expect(all.length).toBeGreaterThan(0);
  const url = /https?:\/\/\S+\/alertas\/\S+/.exec(all.at(-1)!.body)![0];
  return new URL(url).pathname;
}

async function signUp(page: Page, email: string, follows = false) {
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel(/Quero receber por e-mail/).check();
  if (follows) await page.getByLabel(/Autorizo o Cobra a guardar/).check();
  await page.getByRole("button", { name: /resumo/ }).click();
  await expect(page.getByTestId("enviado")).toBeVisible({ timeout: 15_000 });
}

async function confirmLast(page: Page, email: string) {
  await page.goto(await lastLink(email));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("confirmado")).toBeVisible({ timeout: 15_000 });
}

const keys = deriveKeys(E2E_ALERTS_SECRET);

async function subscription(email: string) {
  const [row] = await sql<{ id: string; status: string }[]>`
    select id, status from alerts.subscriptions
    where email_lookup = ${emailLookup(keys, email)}`;
  return row;
}

test("cadastro só vale depois de confirmado pelo link, uma vez", async ({
  page,
}) => {
  const email = address();
  await page.goto("/alertas");
  await page.getByLabel("Estado (opcional)").selectOption({
    label: "Distrito Federal",
  });
  await signUp(page, email);
  expect((await subscription(email))?.status).toBe("pendente");
  const [message] = await messages(email);
  expect(message!.subject).toBe("Confirme seu cadastro no Cobra");
  const link = await lastLink(email);
  await page.goto(link);
  await expect(page.getByText("Estado: Distrito Federal (DF).")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("confirmado")).toBeVisible({ timeout: 15_000 });
  expect((await subscription(email))?.status).toBe("ativa");

  await page.goto(link);
  await expect(page.getByTestId("link-invalido")).toBeVisible();
});

test("sem a autorização do e-mail, nada é enviado", async ({ page }) => {
  const email = address();
  await page.goto("/alertas");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Receber o resumo" }).click();
  await expect(page.getByTestId("erro-cadastro")).toContainText(
    "autorização do e-mail",
    { timeout: 15_000 },
  );
  expect(await messages(email)).toHaveLength(0);
});

test("seguir pelo perfil pede autorização separada; meus dados mostra, exporta, corrige e apaga", async ({
  page,
}) => {
  const email = address();
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-senado")
    .getByRole("button", { name: /Senadora Teste Um/ })
    .click();
  await page.getByRole("link", { name: "Ver perfil completo" }).click();
  await page.getByTestId("seguir").click();
  await expect(page.getByTestId("seguir-quem")).toContainText(
    "Senadora Teste Um",
    { timeout: 15_000 },
  );

  // Only the e-mail consent: the follows consent is asked for.
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel(/Quero receber por e-mail/).check();
  await page.getByRole("button", { name: "Seguir e receber o resumo" }).click();
  await expect(page.getByTestId("erro-cadastro")).toContainText(
    "guardar os políticos",
    { timeout: 15_000 },
  );
  expect(await messages(email)).toHaveLength(0);

  await signUp(page, email, true);
  expect((await messages(email))[0]!.subject).toBe(
    "Confirme que quer seguir Senadora Teste Um no Cobra",
  );
  await page.goto(await lastLink(email));
  await expect(page.getByTestId("confirmar-seguir")).toContainText(
    "Senadora Teste Um",
  );
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("confirmado")).toBeVisible({ timeout: 15_000 });

  // Meus dados.
  await page.goto("/alertas/meus-dados");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Enviar o link" }).click();
  await expect(page.getByTestId("enviado")).toBeVisible({ timeout: 15_000 });
  const manage = await lastLink(email);
  await page.goto(manage);
  await expect(page.getByTestId("meus-dados")).toContainText(email);
  await expect(page.getByTestId("meus-dados")).toContainText(
    "recebendo o resumo semanal",
  );
  await expect(page.getByTestId("seguidos")).toContainText("Senadora Teste Um");

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Baixar meus dados (JSON)" }).click();
  const file = await (await download).path();
  const exported = JSON.parse(
    await import("node:fs").then((fs) => fs.readFileSync(file, "utf8")),
  ) as { email: string; follows: { name: string }[]; followsConsent: unknown };
  expect(exported.email).toBe(email);
  expect(exported.follows.map((f) => f.name)).toEqual(["Senadora Teste Um"]);
  expect(exported.followsConsent).not.toBeNull();

  await page.locator('select[name="uf"]').selectOption({
    label: "Goiás",
  });
  await page.getByRole("button", { name: "Salvar estado" }).click();
  await expect(page.getByTestId("feito")).toHaveText("Estado atualizado.", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("meus-dados")).toContainText("Goiás (GO)");

  await page
    .getByRole("button", { name: "Deixar de seguir Senadora Teste Um" })
    .click();
  await expect(page.getByTestId("feito")).toContainText("deixou de seguir", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("seguidos")).toHaveCount(0);

  const { id } = (await subscription(email))!;
  await page.getByLabel(/Quero apagar meu e-mail/).check();
  await page
    .getByRole("button", { name: "Apagar todos os meus dados" })
    .click();
  await expect(page.getByTestId("apagado")).toBeVisible({ timeout: 15_000 });
  expect(
    await sql`select 1 from alerts.subscriptions where id = ${id}`,
  ).toHaveLength(0);
  const actions = await sql<{ action: string }[]>`
    select action from alerts.access_log where subscription_id = ${id} order by id`;
  expect(actions.map((a) => a.action)).toEqual(
    expect.arrayContaining([
      "cadastro",
      "confirmacao",
      "link_meus_dados",
      "acesso",
      "exportacao",
      "correcao",
      "deixou_de_seguir",
      "exclusao",
    ]),
  );
  await page.goto(manage);
  await expect(page.getByTestId("link-invalido")).toBeVisible();
});

test("a resposta é a mesma para endereço desconhecido, e o limite por hora vale", async ({
  page,
}) => {
  const unknown = address();
  await page.goto("/alertas/meus-dados");
  await page.getByLabel("E-mail", { exact: true }).fill(unknown);
  await page.getByRole("button", { name: "Enviar o link" }).click();
  await expect(page.getByTestId("enviado")).toBeVisible({ timeout: 15_000 });
  expect(await messages(unknown)).toHaveLength(0);

  const email = address();
  for (let i = 0; i < 4; i++) {
    await page.goto("/alertas");
    await signUp(page, email);
  }
  expect(await messages(email)).toHaveLength(3);
});

test("saída em um clique, pelo botão e pelo POST do provedor", async ({
  page,
  request,
}) => {
  for (const how of ["botao", "post"]) {
    const email = address();
    await page.goto("/alertas");
    await signUp(page, email);
    await confirmLast(page, email);
    const { id } = (await subscription(email))!;
    const token = unsubscribeToken(keys, id);
    if (how === "botao") {
      await page.goto(`/alertas/sair/${token}`);
      await page
        .getByRole("button", { name: "Não quero mais receber o resumo" })
        .click();
      await expect(page.getByTestId("saiu")).toBeVisible({ timeout: 15_000 });
    } else {
      const response = await request.post(`/alertas/sair/${token}/um-clique`, {
        form: { "List-Unsubscribe": "One-Click" },
      });
      expect(response.status()).toBe(200);
    }
    const [row] = await sql<{ status: string }[]>`
      select status from alerts.subscriptions where id = ${id}`;
    expect(row!.status).toBe("cancelada");
  }
  await page.goto(`/alertas/sair/${"0".repeat(36)}.falso`);
  await expect(page.getByTestId("link-invalido")).toBeVisible();
});

test("o banco guarda e-mail e seguidos cifrados", async ({ page }) => {
  const email = address();
  await page.goto("/alertas");
  await signUp(page, email);
  const rows = await sql<{ email_enc: Buffer; prefs_enc: Buffer }[]>`
    select email_enc, prefs_enc from alerts.subscriptions`;
  for (const r of rows) {
    expect(r.email_enc.toString("latin1")).not.toContain("@exemplo.org");
    expect(r.prefs_enc.toString("latin1")).not.toContain("follows");
  }
});

test("cadastro, seguir e privacidade sem violações de acessibilidade", async ({
  page,
}) => {
  const [{ id }] = await sql<{ id: number }[]>`
    select id::int from core.politicians where source_id = '9001' limit 1`;
  for (const path of [
    `/alertas?seguir=${id}`,
    "/alertas/meus-dados",
    "/privacidade",
  ]) {
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
