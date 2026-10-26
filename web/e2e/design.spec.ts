import { expect, test } from "@playwright/test";

// Scenarios from openspec spec `identidade-visual`: Catálogo de componentes fora dos buscadores.

test("mostra os componentes com o aviso de dados fictícios", async ({
  page,
}) => {
  await page.goto("/design");
  await expect(
    page.getByRole("heading", { level: 1, name: "Catálogo de componentes" }),
  ).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Dados fictícios.");
  for (const section of [
    "Cores",
    "Tipografia",
    "Botões e filtros",
    "Abas",
    "Números com referência",
    "Votos",
    "Selo de partido",
  ]) {
    await expect(
      page.getByRole("heading", { level: 2, name: section }),
    ).toBeVisible();
  }
});

test("pede aos buscadores que não indexem a página", async ({ page }) => {
  await page.goto("/design");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});
