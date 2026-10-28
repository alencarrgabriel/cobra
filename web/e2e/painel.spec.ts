import path from "node:path";

import { loadEnvConfig } from "@next/env";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { TOTP } from "otpauth";
import postgres from "postgres";

import { e2eUrl } from "./db/setup";

// Scenarios from openspec change `painel-editorial`. The full flow needs the local Supabase
// Auth (`npx supabase start`); without it (as in CI) only the "not configured" path runs.

loadEnvConfig(path.resolve(__dirname, "../.."), false, {
  info: () => {},
  error: () => {},
});
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const configured = Boolean(URL_ && PUBLISHABLE && SECRET);
// A throwaway password for users created and deleted by this test only.
const PASSWORD = "senha-de-teste-do-painel-123"; // gitleaks:allow

test.describe("sem configuração", () => {
  test.skip(configured, "o Supabase Auth local está configurado");

  test("o painel diz que está indisponível", async ({ page }) => {
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/painel\/indisponivel$/);
  });
});

test.describe("com o Supabase Auth local", () => {
  test.skip(!configured, "precisa do Supabase Auth local");

  const admin = () =>
    createClient(URL_!, SECRET!, { auth: { persistSession: false } });
  const created: string[] = [];

  async function user(email: string, editor: boolean) {
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    created.push(data.user.id);
    if (editor) {
      const sql = postgres(e2eUrl(), { max: 1 });
      await sql`
        insert into editorial.editors (email, name) values (${email}, 'Editora Teste')
        on conflict (email) do update set active = true`;
      await sql.end();
    }
  }

  async function signIn(page: Page, email: string) {
    await page.goto("/painel");
    await expect(page).toHaveURL(/\/painel\/entrar$/);
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    // The panel redirects after streaming the page, which can be slow on a busy machine.
    await expect(page).toHaveURL(/\/painel\/codigo$/, { timeout: 15_000 });
    const secret = await page.getByTestId("totp-secret").textContent();
    const code = new TOTP({ secret: secret!.trim() }).generate();
    await page.getByLabel("Código").fill(code);
    await page.getByRole("button", { name: "Confirmar" }).click();
  }

  test.afterAll(async () => {
    for (const id of created) await admin().auth.admin.deleteUser(id);
  });

  test("cadastro aberto é recusado", async () => {
    const client = createClient(URL_!, PUBLISHABLE!, {
      auth: { persistSession: false },
    });
    const { error } = await client.auth.signUp({
      email: `curioso-${Date.now()}@cobra.test`,
      password: PASSWORD,
    });
    expect(error).not.toBeNull();
  });

  test("senha e código levam à fila; quem não é editor fica de fora", async ({
    page,
  }) => {
    const outsider = `fora-${Date.now()}@cobra.test`;
    await user(outsider, false);
    await signIn(page, outsider);
    await expect(page).toHaveURL(/\/painel\/sem-acesso$/, { timeout: 15_000 });
  });

  test("rascunho não aparece; aprovação publica com quem e quando", async ({
    page,
  }) => {
    const email = `editora-${Date.now()}@cobra.test`;
    await user(email, true);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });
    const item = page
      .getByTestId("fila")
      .getByRole("listitem")
      .filter({ hasText: "PL 11/2003" })
      .first();
    await expect(item).toContainText("Governo e Oposição divergiram");
    await item.getByRole("link", { name: "Escrever o resumo" }).click();
    // Without ANTHROPIC_API_KEY there is no AI draft (change rascunho-ia).
    if (!process.env.ANTHROPIC_API_KEY) {
      await expect(
        page.getByRole("button", { name: "Gerar rascunho com IA" }),
      ).toHaveCount(0);
    }

    const text =
      "O projeto proíbe peças publicitárias de teste. Autores dizem que protege o público; críticos dizem que limita a publicidade.";
    await page.getByLabel("Texto").fill(text);
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByTestId("mensagem-painel")).toContainText(
      "Rascunho salvo",
    );
    const editUrl = page.url();

    // A draft is not public.
    await page.goto("/representantes/5300108");
    await page
      .getByTestId("secao-camara")
      .getByRole("button", { name: /Deputado Teste A/ })
      .click();
    await page.getByRole("link", { name: "Ver perfil completo" }).click();
    await expect(page).toHaveURL(/\/politicos\/\d+-deputado-teste-a$/);
    const profileUrl = page.url();
    await expect(page.getByTestId("como-votou")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("resumo")).toHaveCount(0);

    await page.goto(editUrl);
    await page
      .getByRole("button", { name: "Aprovar e publicar a versão 1" })
      .click();
    await expect(page.getByTestId("mensagem-painel")).toContainText(
      "publicado",
    );
    await expect(page.getByTestId("historico")).toContainText(
      `aprovada por ${email}`,
    );

    await page.goto(profileUrl);
    await expect(page.getByTestId("resumo")).toContainText(text);
    await expect(page.getByTestId("resumo")).toContainText(
      "Resumo revisado por pessoas em",
    );
  });
});

test("página de entrada sem violações WCAG 2.1 A/AA", async ({ page }) => {
  await page.goto("/painel/entrar");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
