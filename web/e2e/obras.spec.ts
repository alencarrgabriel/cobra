import { expect, test } from "@playwright/test";

// Scenarios from openspec spec `obras-na-cidade`, against the seed in e2e/db/seed.sql.

test.describe("página de obras", () => {
  test("resumo bate com os dados guardados e mostra fonte e datas", async ({
    page,
  }) => {
    await page.goto("/obras");
    await expect(page.getByTestId("total-obras")).toHaveText("8");
    await expect(page.getByTestId("valor-previsto")).toHaveText("R$ 34,4 mi");
    const counts = {
      completed: "1",
      in_progress: "2",
      stopped: "1",
      unfinished: "1",
      registered: "2",
      cancelled: "1",
    };
    for (const [status, n] of Object.entries(counts)) {
      await expect(
        page.getByTestId(`situacao-${status}`).locator("strong"),
      ).toHaveText(n);
    }
    const source = page.getByTestId("fonte").first();
    await expect(source).toContainText("Fonte: Obrasgov.br");
    await expect(source).toContainText("base atualizada em 23/10/2026");
    await expect(source).toContainText("informados pelos gestores");
  });

  test("filtro de situação fica no endereço e vale para lista e mapa", async ({
    page,
  }) => {
    await page.goto("/obras");
    await page
      .getByRole("list", { name: "Situação" })
      .getByRole("link", { name: "Paralisada" })
      .click();
    await expect(page).toHaveURL(/situacao=paralisada/);
    const items = page.getByTestId("lista-obras").locator("li");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("UBS de Teste do Sol Nascente");
    await expect(page.locator("svg a")).toHaveCount(1);
    await expect(
      page.getByRole("list", { name: "Situação" }).getByRole("link", {
        name: "Paralisada",
      }),
    ).toHaveAttribute("aria-current", "true");
  });

  test("endereço compartilhado com situação e área mostra o mesmo resultado", async ({
    page,
  }) => {
    await page.goto("/obras?situacao=em-execucao&area=saude");
    const items = page.getByTestId("lista-obras").locator("li");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("Ampliação de Hospital de Teste");
  });

  test("filtros inválidos são ignorados", async ({ page }) => {
    await page.goto(
      "/obras?situacao=xyz&area=nao-existe&ordem=desempenho&pagina=-1",
    );
    await expect(page.getByTestId("lista-obras").locator("li")).toHaveCount(8);
  });

  test("ordem por nome é alfabética e o critério aparece na tela", async ({
    page,
  }) => {
    await page.goto("/obras?ordem=nome");
    await expect(page.getByTestId("criterio")).toHaveText(
      "Em ordem alfabética pelo nome da obra.",
    );
    const names = await page
      .getByTestId("lista-obras")
      .locator("li > a")
      .allTextContents();
    expect(names).toEqual(
      [...names].sort((a, b) => a.localeCompare(b, "pt-BR")),
    );
    expect(names[0]).toBe("Ampliação de Hospital de Teste");
  });

  test("ordem padrão é por valor previsto, do maior para o menor", async ({
    page,
  }) => {
    await page.goto("/obras");
    await expect(
      page.getByTestId("lista-obras").locator("li > a").first(),
    ).toHaveText("Ampliação de Hospital de Teste");
    await expect(page.getByTestId("criterio")).toContainText(
      "Do maior para o menor valor previsto",
    );
  });

  test("obra sem localização é contada e continua na lista", async ({
    page,
  }) => {
    await page.goto("/obras");
    await expect(page.getByTestId("sem-localizacao")).toContainText(
      "1 obra sem localização não aparece no mapa",
    );
    await expect(page.locator("svg a")).toHaveCount(7);
    await expect(page.getByTestId("lista-obras")).toContainText(
      "Creche de Teste Sem Localização",
    );
  });
});

test.describe("ficha da obra", () => {
  test("obra paralisada mostra há quantos meses, a data e a justificativa", async ({
    page,
  }) => {
    await page.goto("/obras/900002.53-02");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "UBS de Teste do Sol Nascente",
      }),
    ).toBeVisible();
    await expect(page.locator("main header")).toContainText(
      /Paralisada, há \d+ meses/,
    );
    const history = page.getByTestId("historico");
    await expect(history).toContainText("Paralisada em 07/05/2025");
    await expect(history).toContainText(
      "Problemas de execução apontados no relatório de acompanhamento",
    );
    await expect(page.getByText("CONSTRUTORA DE TESTE LTDA")).toBeVisible();
    await expect(page).toHaveTitle(/UBS de Teste do Sol Nascente/);
  });

  test("obra com nota de qualidade mostra as datas como vieram e a nota", async ({
    page,
  }) => {
    await page.goto("/obras/900006.53-06");
    await expect(page.getByText("10/01/2025")).toBeVisible();
    await expect(page.getByText("10/01/2024")).toBeVisible();
    await expect(page.getByTestId("notas-qualidade")).toContainText(
      "Término previsto anterior ao início previsto, informado assim pela fonte.",
    );
  });

  test("tem link para conferir na fonte", async ({ page }) => {
    await page.goto("/obras/900001.53-01");
    await expect(
      page.getByTestId("fonte").getByRole("link", { name: "Obrasgov.br" }),
    ).toHaveAttribute(
      "href",
      /api-publica\.obrasgov\.gestao\.gov\.br.*900001\.53-01/,
    );
  });

  test("código inexistente responde 404", async ({ page }) => {
    for (const path of ["/obras/999999.53-99", "/obras/nao-existe"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: "Página não encontrada" }),
      ).toBeVisible();
    }
  });
});
