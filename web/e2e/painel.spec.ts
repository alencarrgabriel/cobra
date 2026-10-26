import { expect, test } from "@playwright/test";

// Scenarios from openspec spec `identidade-visual`: Painel lateral e gaveta.

test("abre pelo teclado, fecha com Esc e devolve o foco ao card", async ({
  page,
}) => {
  await page.goto("/design");
  const card = page.getByRole("button", { name: /Bruno Fictício/ });
  await card.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Bruno Fictício" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "Fechar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(card).toBeFocused();
});

test.describe("celular (360 px)", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("o painel aparece como gaveta presa à parte de baixo", async ({
    page,
  }) => {
    await page.goto("/design");
    await page.getByRole("button", { name: /Ana Exemplo/ }).click();
    const panel = page.getByRole("dialog", { name: "Ana Exemplo" });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(Math.round(box!.y + box!.height)).toBe(740);
    expect(Math.round(box!.width)).toBe(360);
  });
});

test.describe("computador (1440 px)", () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
  });

  test("o painel aparece ao lado, sem bloquear a página", async ({ page }) => {
    await page.goto("/design");
    await page.getByRole("button", { name: /Ana Exemplo/ }).click();
    const panel = page.getByRole("dialog", { name: "Ana Exemplo" });
    const box = await panel.boundingBox();
    expect(box!.width).toBe(400);
    expect(box!.x + box!.width).toBeGreaterThan(1400);
    // Non-modal: the rest of the page stays clickable.
    await page.getByRole("button", { name: /Carla Modelo/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Carla Modelo" }),
    ).toBeVisible();
  });
});

test("o aviso é anunciado e some sozinho", async ({ page }) => {
  await page.goto("/design");
  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByRole("status")).toHaveText("Link copiado");
  await expect(page.getByRole("status")).toHaveText("", { timeout: 4000 });
});
