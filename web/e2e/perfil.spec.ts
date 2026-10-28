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
  // The profile reads many sections; the first one after a cold start can take a while.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 15_000,
  });
}

/** Opens a tab of the profile through the tab bar, as a person would. */
async function goTab(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Seções do perfil" })
    .getByRole("link", { name })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Seções do perfil" })
      .getByRole("link", { name }),
  ).toHaveAttribute("aria-current", "page", { timeout: 15_000 });
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
  await goTab(page, "Emendas e obras");
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

test("trajetória eleitoral do TSE, da mais recente à mais antiga", async ({
  page,
}) => {
  await openProfile(page);
  await goTab(page, "Trajetória");
  const block = page.getByTestId("trajetoria");
  await expect(block.locator("tbody tr td:first-child")).toHaveText([
    "2022",
    "2014",
    "2010",
  ]);
  const first = block.locator("tbody tr").first();
  await expect(first).toContainText("Senador");
  await expect(first).toContainText("714.562");
  await expect(first).toContainText("Eleito(a)");
  await expect(block.locator("tbody tr").nth(2)).toContainText("—");
  await expect(page.getByTestId("partidos-disputados")).toHaveText(
    "PSB (2010 a 2014) → PL (2022)",
  );
  await expect(block).toContainText("Fonte: Tribunal Superior Eleitoral");
});

test("patrimônio declarado com composição e variação", async ({ page }) => {
  await openProfile(page);
  await goTab(page, "Patrimônio e campanha");
  const block = page.getByTestId("patrimonio");
  const rows = block.locator("tbody tr");
  await expect(rows.locator("td:first-child")).toHaveText([
    "2022",
    "2014",
    "2010",
  ]);
  await expect(rows.nth(0)).toContainText("R$ 1,5 mi");
  await expect(rows.nth(0)).toContainText("R$ 1,2 mi");
  await expect(rows.nth(0)).toContainText("+R$ 500 mil (+50%)");
  await expect(rows.nth(1)).toContainText("+R$ 1 mi");
  await expect(rows.nth(2)).toContainText("Nenhum bem declarado ao TSE");
  await expect(rows.nth(2).locator("td").last()).toHaveText("—");
  await expect(block).toContainText("sem correção pela inflação");
});

test("receitas de campanha com pessoas físicas só somadas", async ({
  page,
}) => {
  await openProfile(page);
  await goTab(page, "Patrimônio e campanha");
  const block = page.getByTestId("receitas");
  await expect(
    block.getByRole("heading", { name: "2022: R$ 1,1 mi" }),
  ).toBeVisible();
  await expect(block).toContainText("Partidos: R$ 1 mi (95%)");
  await expect(page.getByTestId("pessoas-fisicas-2022")).toHaveText(
    "20 pessoas físicas doaram R$ 50 mil.",
  );
  await expect(block).toContainText("PARTIDO TESTE - DF: R$ 1 mi");
  await expect(block).toContainText(
    "Doadores pessoas físicas aparecem só somados",
  );
});

test("como votou: deputado e senadora com votos, distrital com traço", async ({
  page,
}) => {
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-camara")
    .getByRole("button", { name: /Deputado Teste A/ })
    .click();
  await page.getByRole("link", { name: "Ver perfil completo" }).click();
  await goTab(page, "Votos");
  const block = page.getByTestId("como-votou");
  await expect(block.getByRole("listitem")).toHaveCount(1);
  await expect(block).toContainText("10/06/2026");
  await expect(block.getByRole("link", { name: "PL 11/2003" })).toHaveAttribute(
    "href",
    /\/votacoes\/\d+$/,
  );
  await expect(block.getByTestId("voto")).toHaveText("Não");
  await block.getByText("Mais sobre esta votação").click();
  await expect(block.getByTestId("relevancia")).toHaveText(
    "Votação relevante: Governo e Oposição divergiram.",
  );
  await expect(block).not.toContainText("requerimento simbólico");

  await openProfile(page);
  await goTab(page, "Votos");
  const senate = page.getByTestId("como-votou");
  await expect(senate.getByTestId("voto")).toHaveText("Ausente: Licença saúde");
  await expect(senate).toContainText("Votações secretas e simbólicas");

  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-cldf")
    .getByRole("button", { name: /Distrital Teste C/ })
    .click();
  await page.getByRole("link", { name: "Ver perfil completo" }).click();
  await goTab(page, "Votos");
  await expect(page.getByTestId("como-votou")).toContainText(
    "as votações da Câmara Legislativa não são coletadas",
  );
});

test("gastos da cota por tipo, sem fornecedor pessoa física", async ({
  page,
}) => {
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-camara")
    .getByRole("button", { name: /Deputado Teste A/ })
    .click();
  await page.getByRole("link", { name: "Ver perfil completo" }).click();
  await goTab(page, "Gastos");
  const block = page.getByTestId("gastos");
  await expect(
    block.getByRole("heading", { name: "2026: R$ 40 mil" }),
  ).toBeVisible();
  await expect(block.getByRole("listitem").first()).toHaveText(
    "COMBUSTÍVEIS E LUBRIFICANTES.: R$ 30 mil",
  );
  await expect(block).toContainText(
    "Fornecedores pessoas físicas não são identificados",
  );
  await expect(
    block.getByRole("link", { name: "Ver os gastos no site oficial" }),
  ).toHaveAttribute("href", "https://www.camara.leg.br/deputados/8001");
});

test("presença com a mediana da casa", async ({ page }) => {
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-camara")
    .getByRole("button", { name: /Deputado Teste A/ })
    .click();
  await page.getByRole("link", { name: "Ver perfil completo" }).click();
  await goTab(page, "Presença");
  await expect(page.getByTestId("presenca-2026")).toHaveText(
    "2026: presente em 10 de 12 sessões deliberativas do Plenário (83%). Mediana dos deputados: 83%.",
  );
  await expect(page.getByTestId("presenca")).toContainText(
    "Períodos de licença não são descontados",
  );

  await openProfile(page);
  await goTab(page, "Presença");
  await expect(page.getByTestId("presenca-2026")).toContainText(
    "compareceu a 0 de 1 votações nominais do Plenário (0%). Ausências: Licença saúde: 1.",
  );
});

test("o que ainda não foi coletado aparece com traço, nunca zero", async ({
  page,
}) => {
  await openProfile(page);
  const block = page.getByTestId("ainda-nao");
  await expect(block).toContainText("Projetos de autoria e relatoria");
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

test("resumo: faixa de números na mesma ordem, com traço e motivo onde falta", async ({
  page,
}) => {
  await openProfile(page);
  const strip = page.getByTestId("faixa");
  await expect(strip.getByRole("listitem")).toHaveCount(5);
  await expect(strip.locator("li a > span:first-child")).toHaveText([
    "Comparecimento",
    "Salário",
    "Cota parlamentar",
    "Emendas ao DF",
    "Patrimônio declarado",
  ]);
  // The salary is not collected yet: a dash and why, never zero.
  const salary = strip.getByRole("listitem").nth(1);
  await expect(salary).toContainText("Ainda não coletado");
  await expect(salary).not.toContainText("R$ 0");
  // Each number leads to its tab.
  await strip.getByRole("link", { name: /Patrimônio declarado/ }).click();
  await expect(page).toHaveURL(/\/patrimonio$/, { timeout: 15_000 });
});

test("abas têm endereço próprio, marcam a atual e as desconhecidas dão 404", async ({
  page,
}) => {
  await openProfile(page);
  const base = new URL(page.url()).pathname;
  const tabs = page.getByRole("navigation", { name: "Seções do perfil" });
  await expect(tabs.getByRole("link")).toHaveText([
    "Resumo",
    "Votos",
    "Presença",
    "Gastos",
    "Emendas e obras",
    "Trajetória",
    "Patrimônio e campanha",
  ]);
  await expect(tabs.getByRole("link", { name: "Resumo" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await goTab(page, "Gastos");
  await expect(page).toHaveURL(new RegExp(`${base}/gastos$`));
  const id = /\/politicos\/(\d+)-/.exec(base)![1];
  await page.goto(`/politicos/${id}-nome-antigo/votos`);
  await expect(page).toHaveURL(new RegExp(`${base}/votos$`));
  expect((await page.goto(`${base}/inexistente`))?.status()).toBe(404);
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
