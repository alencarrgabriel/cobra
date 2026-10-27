import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Scenarios from openspec change `compartilhamento`, against e2e/db/seed.sql.

const WORK = "/obras/900002.53-02";

/** Width and height from the PNG header (IHDR). */
function pngSize(body: Buffer) {
  expect(body.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

async function profileId(page: Page): Promise<string> {
  await page.goto("/representantes/5300108");
  await page
    .getByTestId("secao-senado")
    .getByRole("button", { name: /Senadora Teste Um/ })
    .click();
  const href = await page
    .getByRole("link", { name: "Ver perfil completo" })
    .getAttribute("href");
  return /\/politicos\/(\d+)-/.exec(href!)![1]!;
}

test("cards nos três formatos, com 404 para código e formato desconhecidos", async ({
  page,
  request,
}) => {
  const id = await profileId(page);
  const sizes = {
    stories: [1080, 1920],
    feed: [1080, 1350],
    link: [1200, 630],
  };
  for (const path of [
    `politico/${id}`,
    "representantes/53",
    "obra/900002.53-02",
  ]) {
    for (const [format, [width, height]] of Object.entries(sizes)) {
      const response = await request.get(`/cartao/${path}/${format}`);
      expect(response.status(), `${path}/${format}`).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      expect(pngSize(await response.body())).toEqual({ width, height });
    }
  }
  expect((await request.get("/cartao/obra/999999.53-99/feed")).status()).toBe(
    404,
  );
  expect((await request.get(`/cartao/politico/${id}/quadrado`)).status()).toBe(
    404,
  );
  expect((await request.get("/cartao/representantes/99/feed")).status()).toBe(
    404,
  );
});

test("prévia de link nas três páginas", async ({ page }) => {
  const id = await profileId(page);
  for (const [path, card] of [
    [`/politicos/${id}`, `/cartao/politico/${id}/link`],
    ["/representantes/53", "/cartao/representantes/53/link"],
    [WORK, "/cartao/obra/900002.53-02/link"],
  ]) {
    await page.goto(path);
    const og = (name: string) =>
      page.locator(`meta[property="og:${name}"]`).getAttribute("content");
    expect(await og("image")).toMatch(
      new RegExp(`^https?://[^/]+${card.replace(/\./g, "\.")}$`),
    );
    expect(await og("title")).toBeTruthy();
    expect(await og("description")).toBeTruthy();
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
  }
});

test("painel com WhatsApp em destaque, link da página e aviso ao copiar", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(WORK);
  await page.getByRole("button", { name: "Compartilhar" }).click();
  const panel = page.getByTestId("painel-compartilhar");
  await expect(
    panel.getByRole("img", { name: /Prévia do card/ }),
  ).toHaveAttribute("src", "/cartao/obra/900002.53-02/feed");
  const first = panel.getByRole("listitem").first().getByRole("link");
  await expect(first).toHaveText("Enviar no WhatsApp");
  const href = await first.getAttribute("href");
  const text = new URL(href!).searchParams.get("text")!;
  expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(text).toContain("UBS de Teste do Sol Nascente");
  expect(text).toMatch(/https?:\/\/[^/]+\/obras\/900002\.53-02$/);

  await panel.getByRole("button", { name: "Stories (9:16)" }).click();
  await expect(
    panel.getByRole("img", { name: /Prévia do card/ }),
  ).toHaveAttribute("src", "/cartao/obra/900002.53-02/stories");
  await expect(
    panel.getByRole("link", { name: "Baixar imagem" }),
  ).toHaveAttribute("download", "cobra-obra-900002.53-02-stories.png");
  await expect(
    panel.getByRole("link", { name: "Postar no X" }),
  ).toHaveAttribute("href", /^https:\/\/x\.com\/intent\/tweet\?/);

  await panel.getByRole("button", { name: "Copiar link" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Link copiado" }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /\/obras\/900002\.53-02$/,
  );
});

test("link de representantes usa o código IBGE, nunca o CEP", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("CEP, cidade ou UF").fill("70040-010");
  await page.getByRole("button", { name: "Ver meus representantes" }).click();
  await expect(page).toHaveURL(/\/representantes\/5300108$/);
  await page.getByRole("button", { name: "Compartilhar" }).click();
  const href = await page
    .getByTestId("painel-compartilhar")
    .getByRole("link", { name: "Enviar no WhatsApp" })
    .getAttribute("href");
  const text = decodeURIComponent(href!);
  expect(text).toMatch(/\/representantes\/5300108$/);
  expect(text).not.toContain("70040");
});

test("painel aberto sem violações de acessibilidade", async ({ page }) => {
  await page.goto(WORK);
  await page.getByRole("button", { name: "Compartilhar" }).click();
  await expect(page.getByTestId("painel-compartilhar")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
