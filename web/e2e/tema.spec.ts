import { expect, test } from "@playwright/test";

// Scenarios from openspec spec `identidade-visual`: Tema claro e escuro.
const DARK_BG = "rgb(18, 19, 17)";
const LIGHT_BG = "rgb(239, 238, 233)";
const bodyBg = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("segue o tema escuro do sistema sem escolha salva", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await bodyBg(page)).toBe(DARK_BG);
});

test("lembra a escolha depois de recarregar", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Alternar entre tema claro e escuro" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await bodyBg(page)).toBe(LIGHT_BG);
});

test("aplica o tema salvo antes de qualquer JavaScript do app", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    localStorage.setItem("cobra-theme", "dark"),
  );
  // Block the app bundles: only the inline head script can set the theme.
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bodyBg(page)).toBe(DARK_BG);
});
