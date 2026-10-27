import { expect, test } from "@playwright/test";

// Scenarios from openspec spec `identidade-visual`: Navegação no computador e no celular.

test.describe("celular (360 px)", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("mostra a barra inferior com as cinco seções", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByRole("navigation", {
      name: "Seções (barra inferior)",
    });
    await expect(bar).toBeVisible();
    for (const label of [
      "Início",
      "Representantes",
      "Votações",
      "Obras",
      "Planos",
    ]) {
      await expect(bar.locator("li", { hasText: label })).toBeVisible();
    }
    // Five sections fit the width in a single row, without scrolling sideways.
    expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    const tops = await bar
      .locator("li")
      .evaluateAll((items) =>
        items.map((li) => Math.round(li.getBoundingClientRect().top)),
      );
    expect(new Set(tops).size).toBe(1);
    await expect(
      page.getByRole("navigation", { name: "Seções", exact: true }),
    ).toBeHidden();
  });

  test("a barra inferior não cobre o fim do conteúdo", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const barTop = await page
      .getByRole("navigation", { name: "Seções (barra inferior)" })
      .evaluate((el) => el.getBoundingClientRect().top);
    const mainBottom = await page
      .locator("main")
      .evaluate((el) => el.getBoundingClientRect().bottom);
    expect(mainBottom).toBeLessThanOrEqual(barTop);
  });
});

test.describe("computador (1440 px)", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
  });

  test("mostra as seções na barra superior e marca a atual", async ({
    page,
  }) => {
    await page.goto("/");
    const top = page.getByRole("navigation", { name: "Seções", exact: true });
    await expect(top).toBeVisible();
    await expect(top.getByRole("link", { name: "Início" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      page.locator('nav[aria-label="Seções (barra inferior)"]'),
    ).toBeHidden();
  });
});

test("seções ainda não entregues aparecem como em breve e não são links", async ({
  page,
}) => {
  await page.goto("/");
  for (const label of ["Votações"]) {
    await expect(
      page.getByRole("link", { name: new RegExp(label) }),
    ).toHaveCount(0);
  }
  await expect(page.getByText("em breve").first()).toBeAttached();
});

test("Obras é um link e fica marcada também na ficha de uma obra", async ({
  page,
}) => {
  await page.goto("/obras/900001.53-01");
  const top = page.getByRole("navigation", { name: "Seções", exact: true });
  const bar = page.getByRole("navigation", { name: "Seções (barra inferior)" });
  const nav = (await top.isVisible()) ? top : bar;
  await expect(nav.getByRole("link", { name: "Obras" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
