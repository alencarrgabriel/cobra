import { createHash } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Scenarios from openspec change `plano-de-governo`, against e2e/db/seed.sql.

const PLAN = "/planos/2022-governador-df";

test("lista de planos com chapa e fonte", async ({ page }) => {
  await page.goto("/planos");
  const link = page.getByRole("link", {
    name: "Governador(a) do Distrito Federal",
  });
  await expect(link).toHaveAttribute("href", PLAN);
  await expect(page.locator("main")).toContainText(
    "Chapa eleita: GOVERNADORA TESTE e VICE TESTE (PL).",
  );
  await expect(page.locator("main")).toContainText("Fonte: TSE");
});

test("temas em ordem alfabética, trecho literal e página do PDF", async ({
  page,
}) => {
  await page.goto(PLAN);
  const chips = await page
    .getByRole("navigation", { name: "Temas do plano" })
    .getByRole("link")
    .allTextContents();
  const labels = chips.map((c) => c.split(" · ")[0]!);
  expect(labels).toEqual(
    [...labels].sort((a, b) => a.localeCompare(b, "pt-BR")),
  );

  await page.getByRole("link", { name: /^Saúde · 1 página$/ }).click();
  await expect(page).toHaveURL(`${PLAN}?tema=saude`);
  const hits = page.getByTestId("trechos");
  await expect(hits.getByRole("link", { name: "Página 1" })).toHaveAttribute(
    "href",
    `${PLAN}/pdf#page=1`,
  );
  await expect(hits.locator("mark").first()).toHaveText("Saúde");
  await expect(hits).toContainText(
    "Mais Saúde para o DF: novas UBS e um hospital regional.",
  );
  await expect(page.getByTestId("palavras-do-tema")).toContainText("hospital");
});

test("obras da mesma área, sem dizer se a promessa foi cumprida", async ({
  page,
}) => {
  await page.goto(`${PLAN}?tema=saude`);
  const works = page.getByTestId("obras-da-area");
  await expect(works).toContainText("Não afirma se uma promessa foi cumprida");
  await expect(
    works.getByRole("link", { name: "UBS de Teste do Sol Nascente" }),
  ).toHaveAttribute("href", "/obras/900002.53-02");
  await expect(
    works.getByRole("link", { name: "Ver todas as obras de Saúde" }),
  ).toHaveAttribute("href", "/obras?area=saude");

  await page.goto(`${PLAN}?tema=moradia`);
  await expect(page.getByTestId("obras-da-area")).toContainText(
    "Nenhuma área de obra do Obrasgov.br corresponde a este tema.",
  );
});

test("busca acha o plural e diz quando não acha", async ({ page }) => {
  await page.goto(PLAN);
  await page.getByLabel("Buscar uma palavra no plano").fill("creche");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(`${PLAN}?q=creche`);
  await expect(page.getByTestId("total-busca")).toHaveText(
    "Aparece em 1 página.",
  );
  await expect(page.getByTestId("trechos").locator("mark")).toHaveText(
    "creches",
  );

  await page.goto(`${PLAN}?q=saude`);
  await expect(page.getByTestId("trechos").locator("mark").first()).toHaveText(
    "Saúde",
  );

  await page.goto(`${PLAN}?q=xyzwq`);
  await expect(page.getByTestId("total-busca")).toHaveText(
    "Essa palavra não aparece no plano.",
  );
});

test("PDF oficial com o hash mostrado e 404 para plano inexistente", async ({
  page,
  request,
}) => {
  await page.goto(PLAN);
  await expect(page.getByText(/SHA-256 do PDF/)).toBeVisible();
  const shown = await page.locator("main").textContent();
  const response = await request.get(`${PLAN}/pdf`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  const hash = createHash("sha256")
    .update(await response.body())
    .digest("hex");
  expect(shown).toContain(hash);

  expect((await request.get("/planos/2018-governador-sp")).status()).toBe(404);
  expect((await request.get("/planos/qualquer-coisa")).status()).toBe(404);
});

for (const theme of ["light", "dark"] as const) {
  test(`plano sem violações WCAG 2.1 A/AA no tema ${theme === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`${PLAN}?tema=saude`);
    await expect(page.getByTestId("trechos")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
}
