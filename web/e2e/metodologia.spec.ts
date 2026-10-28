import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Scenarios from openspec change `metodologia`, against e2e/db/seed.sql.

test("metodologia: critérios, temas e última coleta lidos do banco", async ({
  page,
}) => {
  await page.goto("/metodologia#relevancia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Metodologia",
  );
  await expect(page.getByTestId("criterios")).toContainText(
    "menor que 20% dos votantes",
  );
  await expect(page.getByTestId("criterios").getByRole("listitem")).toHaveCount(
    4,
  );
  const themes = page.getByTestId("temas");
  await expect(themes).toContainText("Saúde", { timeout: 15_000 });
  await expect(themes).toContainText("hospital");
  await expect(page.getByTestId("fonte-camara")).toContainText(
    /Última coleta: \d{2}\/\d{2}\/\d{4}/,
  );
  // Every source has rows in the seed, so every one shows a date.
  await expect(page.getByTestId("fontes").getByRole("listitem")).toHaveCount(7);
  await expect(page.getByTestId("fontes")).not.toContainText("—");
});

test("links do rodapé e da votação levam à metodologia", async ({ page }) => {
  await page.goto("/votacoes");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Metodologia" })
    .click();
  await expect(page).toHaveURL(/\/metodologia$/, { timeout: 15_000 });
  await page.goto("/votacoes");
  await page.getByRole("link", { name: "Veja a metodologia" }).click();
  await expect(page).toHaveURL(/\/metodologia#relevancia$/, {
    timeout: 15_000,
  });
});

test("metodologia sem violações de acessibilidade", async ({ page }) => {
  await page.goto("/metodologia");
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
