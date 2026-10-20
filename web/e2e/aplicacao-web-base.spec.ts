import { expect, test } from "@playwright/test";

// Scenarios from openspec spec `aplicacao-web-base`.

test.describe("páginas em português do Brasil", () => {
  test("a página inicial declara pt-BR e tem título em português", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page).toHaveTitle(/políticos que representam você/);
  });
});

test.describe("layout mobile first", () => {
  test("a página inicial cabe em 360 px sem rolagem horizontal", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      "content",
      /width=device-width/,
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("renderização no servidor", () => {
  test.use({ javaScriptEnabled: false });

  test("o conteúdo principal aparece sem JavaScript", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Cobra" }),
    ).toBeVisible();
    await expect(
      page.getByText("Veja o que fazem os políticos que representam você"),
    ).toBeVisible();
  });
});

test.describe("cabeçalhos de segurança", () => {
  for (const path of ["/", "/api/health"]) {
    test(`presentes em ${path}`, async ({ request }) => {
      const response = await request.get(path);
      const headers = response.headers();
      const maxAge = Number(
        /max-age=(\d+)/.exec(headers["strict-transport-security"] ?? "")?.[1],
      );
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
      expect(headers["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe(
        "strict-origin-when-cross-origin",
      );
    });
  }
});

test.describe("rota de saúde", () => {
  test("responde ok com a versão", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      version: expect.any(String),
    });
  });
});

test.describe("página não encontrada", () => {
  test("responde 404 em português com link para o início", async ({ page }) => {
    const response = await page.goto("/pagina-que-nao-existe");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Página não encontrada" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Voltar para a página inicial" }),
    ).toHaveAttribute("href", "/");
  });
});
