import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Scenarios from openspec change `perfil-do-politico`, against e2e/db/seed.sql.

async function openProfile(page: Page) {
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-senado")
    .getByRole("button", { name: /Senadora Teste Um/ })
    .click();
  await page.getByRole("link", { name: "Ver perfil completo" }).click();
  await expect(page).toHaveURL(/\/politicos\/\d+-senadora-teste-um$/);
}

test("o painel da grade leva ao perfil, com a frase Quem é", async ({
  page,
}) => {
  await openProfile(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Senadora Teste Um",
  );
  await expect(page.getByTestId("quem-e")).toHaveText(
    "Senadora Teste Um tem mandato no Senado Federal pelo Distrito Federal, pelo Partido Liberal, desde 01/02/2023.",
  );
});

test("emendas com a soma e obra com vínculo direto", async ({ page }) => {
  await openProfile(page);
  await expect(page.getByTestId("emendas-total")).toContainText("1 emenda");
  await expect(page.getByTestId("emendas-total")).toContainText(
    "R$ 1.500.000,00 empenhados",
  );
  const works = page.getByTestId("obras");
  await expect(
    works.getByRole("link", { name: "UBS de Teste do Sol Nascente" }),
  ).toHaveAttribute("href", "/obras/900002.53-02");
  await expect(works).toContainText("vínculo direto");
});

test("o que ainda não foi coletado aparece com traço, nunca zero", async ({
  page,
}) => {
  await openProfile(page);
  const block = page.getByTestId("ainda-nao");
  await expect(block).toContainText("Gastos da cota parlamentar");
  await expect(block).toContainText("Ainda não está no Cobra");
  await expect(block).not.toContainText("R$ 0");
});

test("relacionados em ordem alfabética e dados estruturados", async ({
  page,
}) => {
  await openProfile(page);
  const related = page.getByTestId("relacionados");
  const sameUf = related.locator("ul").first().getByRole("link");
  const names = await sameUf.allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  expect(names).not.toContain("Senadora Teste Um");
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(ld).toContain('"@type":"FAQPage"');
  expect(ld).toContain('"@type":"Person"');
});

test("nome antigo no endereço leva ao atual e id inexistente dá 404", async ({
  page,
}) => {
  await openProfile(page);
  const id = /\/politicos\/(\d+)-/.exec(page.url())![1];
  await page.goto(`/politicos/${id}-nome-antigo`);
  await expect(page).toHaveURL(
    new RegExp(`/politicos/${id}-senadora-teste-um$`),
  );
  const response = await page.goto("/politicos/99999999-ninguem");
  expect(response?.status()).toBe(404);
});

for (const theme of ["light", "dark"] as const) {
  test(`perfil sem violações WCAG 2.1 A/AA no tema ${theme === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await openProfile(page);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);
  });
}
