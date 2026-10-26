import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Scenarios from openspec change `mapa-de-obras`, against the seed in e2e/db/seed.sql and
// the small street map in e2e/fixtures (pnpm basemap:test).

test("o arquivo do mapa responde a pedidos por partes (Range)", async ({
  request,
}) => {
  const response = await request.get("/mapa/df.pmtiles", {
    headers: { Range: "bytes=0-126" },
  });
  expect(response.status()).toBe(206);
  expect(response.headers()["content-range"]).toMatch(/^bytes 0-126\/\d+$/);
  const body = await response.body();
  expect(body.length).toBe(127);
  expect(body.subarray(0, 7).toString("latin1")).toBe("PMTiles");
});

test("fontes, ícones e worker do mapa são servidos pelo próprio site", async ({
  request,
}) => {
  for (const path of [
    "/mapa/fonts/Noto%20Sans%20Regular/0-255.pbf",
    "/mapa/sprites/light.json",
    "/mapa/sprites/dark@2x.png",
    "/mapa/lib/maplibre-gl-worker.mjs",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

type MapHandle = {
  jumpTo(o: { center: [number, number]; zoom: number }): void;
  project(c: [number, number]): { x: number; y: number };
  getCanvas(): HTMLCanvasElement;
  getSource(id: string): { getData(): Promise<{ features: unknown[] }> };
  once(event: string, cb: () => void): void;
};

async function openMap(page: Page, path = "/obras") {
  await page.goto(path);
  const switcher = page.locator("[data-map-state]");
  await switcher.scrollIntoViewIfNeeded();
  await expect(switcher).toHaveAttribute("data-map-state", "ready", {
    timeout: 20_000,
  });
  return page.getByTestId("mapa-interativo");
}

test.describe("mapa interativo", () => {
  test("aparece no lugar do desenho, sem pedir nada a outros sites", async ({
    page,
  }) => {
    const foreign: string[] = [];
    page.on("request", (r) => {
      const url = new URL(r.url());
      if (url.protocol.startsWith("http") && url.host !== "localhost:3100") {
        foreign.push(url.host);
      }
    });
    const map = await openMap(page);
    await expect(map.locator("canvas")).toBeVisible();
    await expect(map).toHaveAttribute("aria-label", /use a lista abaixo/);
    await expect(page.getByText("Protomaps © OpenStreetMap")).toBeAttached();
    await expect(page.locator("svg[role=group]")).toBeHidden();
    expect(foreign).toEqual([]);
  });

  test("tocar no pino abre o resumo da obra com link para a ficha", async ({
    page,
  }) => {
    const map = await openMap(page);
    const point = await map.evaluate(async (el) => {
      const m = (el as HTMLElement & { cobraMap: MapHandle }).cobraMap;
      m.jumpTo({ center: [-48.13, -15.83], zoom: 16 });
      await new Promise<void>((resolve) => m.once("idle", resolve));
      const p = m.project([-48.13, -15.83]);
      const box = m.getCanvas().getBoundingClientRect();
      return { x: box.left + p.x, y: box.top + p.y };
    });
    await page.mouse.click(point.x, point.y);
    const popup = page.locator(".maplibregl-popup");
    await expect(popup).toContainText("UBS de Teste do Sol Nascente");
    await expect(popup).toContainText("Paralisada");
    await expect(popup).toContainText("R$ 5,9 mi · 42% executado");
    await expect(
      popup.getByRole("link", { name: "Ver ficha da obra" }),
    ).toHaveAttribute("href", "/obras/900002.53-02");
  });

  test("pinos próximos se agrupam com o número de obras", async ({ page }) => {
    const map = await openMap(page);
    const clustered = await map.evaluate(async (el) => {
      const m = (el as HTMLElement & { cobraMap: MapHandle })
        .cobraMap as MapHandle & {
        queryRenderedFeatures(o: { layers: string[] }): {
          properties: { point_count?: number };
        }[];
      };
      m.jumpTo({ center: [-48.1, -15.82], zoom: 9 });
      await new Promise<void>((resolve) => m.once("idle", resolve));
      return m
        .queryRenderedFeatures({ layers: ["clusters"] })
        .map((f) => f.properties.point_count ?? 0);
    });
    expect(clustered.length).toBeGreaterThan(0);
    expect(Math.max(...clustered)).toBeGreaterThan(1);
  });

  test("o filtro de situação vale para o mapa", async ({ page }) => {
    const map = await openMap(page, "/obras?situacao=paralisada");
    const count = await map.evaluate(async (el) => {
      const m = (el as HTMLElement & { cobraMap: MapHandle }).cobraMap;
      return (await m.getSource("works").getData()).features.length;
    });
    expect(count).toBe(1);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`não tem violações WCAG 2.1 A/AA com o mapa aberto no tema ${theme === "light" ? "claro" : "escuro"}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await openMap(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const summary = results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
      expect(summary).toEqual([]);
    });
  }
});

test("o mapa só carrega quando chega perto da tela", async ({ page }) => {
  const mapRequests: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/mapa/"))
      mapRequests.push(r.url());
  });
  await page.goto("/obras");
  await page.waitForLoadState("networkidle");
  expect(mapRequests).toEqual([]);
  await page.locator("[data-map-state]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-map-state]")).toHaveAttribute(
    "data-map-state",
    "ready",
    { timeout: 20_000 },
  );
  expect(mapRequests.some((u) => u.endsWith("/mapa/df.pmtiles"))).toBe(true);
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a página mostra o desenho do mapa e a lista", async ({ page }) => {
    await page.goto("/obras");
    await expect(page.locator("svg a")).toHaveCount(7);
    await expect(page.getByTestId("mapa-interativo")).toHaveCount(0);
    await expect(page.getByTestId("lista-obras").locator("li")).toHaveCount(8);
  });
});
