import { expect, test } from "@playwright/test";

// Scenarios from openspec change `busca-geografica` (spec busca-de-representantes), against
// the fictitious representatives in e2e/db/seed.sql.

async function search(page: import("@playwright/test").Page, text: string) {
  await page.goto("/");
  await page.getByLabel("CEP, cidade ou UF").fill(text);
  await page.getByRole("button", { name: "Ver meus representantes" }).click();
}

test("CEP do DF leva a Brasília sem o CEP no endereço", async ({ page }) => {
  await search(page, "72210-000");
  await expect(page).toHaveURL(/\/representantes\/5300108$/);
  expect(page.url()).not.toContain("72210");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Seus representantes em Brasília (DF)",
    }),
  ).toBeVisible();
});

test("Brasília mostra senadores, deputados federais e distritais", async ({
  page,
}) => {
  await page.goto("/representantes/5300108");
  await expect(page.getByTestId("secao-senado").locator("li")).toHaveCount(3);
  await expect(page.getByTestId("secao-camara").locator("li")).toHaveCount(2);
  await expect(page.getByTestId("secao-cldf").locator("li")).toHaveCount(2);
  await expect(page.getByTestId("secao-cldf")).toContainText(
    "fazem o papel de deputado estadual e de vereador",
  );
  await expect(page.getByText("eleitos pelo estado inteiro")).toBeVisible();
  await expect(page.getByTestId("secao-senado")).toContainText(
    "Fonte: Senado Federal",
  );
});

test("outra UF avisa que estaduais e vereadores ainda não estão no Cobra", async ({
  page,
}) => {
  await page.goto("/representantes/35");
  await expect(page.getByTestId("secao-camara")).toContainText(
    "Paulista Teste",
  );
  await expect(page.getByTestId("secao-cldf")).toHaveCount(0);
  await expect(page.getByTestId("sem-cobertura")).toContainText(
    "Ainda não estão no Cobra",
  );
});

test("cidade com homônimos pede para escolher", async ({ page }) => {
  await search(page, "Bom Jesus");
  await expect(page).toHaveURL(/escolher=bom%20jesus/);
  const choices = page.getByRole("link", { name: /^Bom Jesus/ });
  await expect(choices).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "Bom Jesus (RS)" }),
  ).toHaveAttribute("href", "/representantes/4302303");
});

test("texto que não é lugar mostra o que pode ser digitado", async ({
  page,
}) => {
  await search(page, "xyzxyz");
  await expect(page.getByTestId("erro-busca")).toContainText(
    "CEP com 8 números",
  );
});

test("filtro por partido fica no endereço", async ({ page }) => {
  await page.goto("/representantes/5300108");
  await page
    .getByRole("navigation", { name: "Filtrar por partido" })
    .getByRole("link", { name: "PL" })
    .click();
  await expect(page).toHaveURL(/partido=PL/);
  await expect(page.getByTestId("secao-senado").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("secao-camara").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("secao-cldf").locator("li")).toHaveCount(1);
});

test("tocar no card abre o resumo com a fonte oficial", async ({ page }) => {
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-senado")
    .getByRole("button", { name: /Senadora Teste Três/ })
    .click();
  const panel = page.getByRole("dialog", { name: "Senadora Teste Três" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Suplente em exercício");
  await expect(panel).toContainText("06/10/2026");
  await expect(
    panel.getByRole("link", { name: "Ver no site do Senado" }),
  ).toHaveAttribute(
    "href",
    "https://www25.senado.leg.br/web/senadores/senador/-/perfil/9003",
  );
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("lugar lembrado no aparelho e esquecido", async ({ page }) => {
  await page.goto("/representantes/5300108");
  // Saved by the page once it runs in the browser.
  await page.waitForFunction(
    () => localStorage.getItem("cobra:lugar") !== null,
  );
  await page.goto("/");
  const remembered = page.getByTestId("lugar-lembrado");
  await expect(remembered.getByRole("link")).toHaveText(
    "Ver seus representantes em Brasília (DF)",
  );
  await remembered.getByRole("button", { name: "Esquecer este lugar" }).click();
  await expect(remembered).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("lugar-lembrado")).toHaveCount(0);
});

test("código de lugar inexistente responde 404", async ({ page }) => {
  const response = await page.goto("/representantes/9999999");
  expect(response?.status()).toBe(404);
});
