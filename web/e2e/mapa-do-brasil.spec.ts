import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Scenarios from openspec change `mapa-do-brasil`, against e2e/db/seed.sql.

test("mapa com os 27 estados, cada um levando à bancada", async ({ page }) => {
  await page.goto("/");
  const map = page.getByRole("group", { name: /Mapa do Brasil/ });
  const links = map.getByRole("link");
  await expect(links).toHaveCount(27);
  const hrefs = await links.evaluateAll((els) =>
    els.map((a) => a.getAttribute("href")),
  );
  for (const href of hrefs) expect(href).toMatch(/^\/representantes\/\d{2}$/);

  await map
    .getByRole("link", { name: "Distrito Federal: ver a bancada" })
    .click();
  await expect(page).toHaveURL(/\/representantes\/53$/);
  await expect(page.getByTestId("secao-senado")).toBeVisible();
});

test("todos os estados com a mesma cor", async ({ page }) => {
  await page.goto("/");
  const fills = await page
    .getByRole("group", { name: /Mapa do Brasil/ })
    .locator("path")
    .evaluateAll((paths) => paths.map((p) => getComputedStyle(p).fill));
  expect(fills).toHaveLength(27);
  expect(new Set(fills).size).toBe(1);
});

test("lista de estados em ordem alfabética e mapa sem JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const names = await page
    .getByTestId("lista-de-estados")
    .getByRole("link")
    .allTextContents();
  expect(names).toHaveLength(27);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  await expect(
    page.getByRole("link", { name: "Distrito Federal: ver a bancada" }),
  ).toHaveAttribute("href", "/representantes/53");
  await context.close();
});

test("placar das votações recentes aparece com traço, sem números", async ({
  page,
}) => {
  await page.goto("/representantes/53");
  const block = page.getByTestId("placar");
  await expect(block).toContainText("Ainda não está no Cobra");
  await expect(block).not.toContainText(/\d/);
});

test("exemplos de cards por regra objetiva", async ({ page, request }) => {
  await page.goto("/");
  const examples = page.getByTestId("exemplos-de-cards");
  const images = examples.getByRole("img");
  await expect(images).toHaveCount(2);
  await expect(images.first()).toHaveAttribute(
    "src",
    "/cartao/representantes/53/feed",
  );
  await expect(examples).toContainText(
    "A obra do DF com a atualização mais recente no Obrasgov.br.",
  );
  for (const src of await images.evaluateAll((els) =>
    els.map((i) => i.getAttribute("src")!),
  )) {
    const response = await request.get(src);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`página inicial sem violações WCAG 2.1 A/AA no tema ${theme === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    await expect(page.getByTestId("exemplos-de-cards")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
}
