import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";

import { e2eUrl } from "./db/setup";

// Scenarios from openspec change `feed-e-pagina-votacao`, against e2e/db/seed.sql.

/** Opens the vote page from its feed card, found by its description. */
async function openVote(page: Page, description: string): Promise<string> {
  await page.goto("/votacoes");
  const card = page.getByTestId("evento").filter({ hasText: description });
  await card.getByRole("heading").getByRole("link").click();
  await expect(page).toHaveURL(/\/votacoes\/\d+$/, { timeout: 15_000 });
  return new URL(page.url()).pathname;
}

/** Secret votes are not in the feed (design D1): the page is reached by its address. */
async function voteId(source: string, sourceId: string): Promise<number> {
  const sql = postgres(e2eUrl(), { max: 1 });
  try {
    const [row] = await sql<{ id: number }[]>`
      select id from core.votes where source = ${source} and source_id = ${sourceId}`;
    return Number(row!.id);
  } finally {
    await sql.end();
  }
}

test("feed lista votações da mais recente para a mais antiga, com fonte", async ({
  page,
}) => {
  await page.goto("/votacoes");
  const feed = page.getByTestId("feed");
  await expect(feed.getByTestId("evento").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(feed).toContainText("Aprovado o projeto de teste.");
  await expect(feed).toContainText("Votação simbólica");
  await expect(
    feed.getByText(/Fonte: Câmara dos Deputados/).first(),
  ).toBeVisible();
  const dates = await feed
    .getByTestId("evento")
    .locator(".eyebrow")
    .allTextContents();
  const iso = dates.map((d) => d.slice(0, 10).split("/").reverse().join("-"));
  expect(iso).toEqual([...iso].sort().reverse());
});

test("filtro por casa mostra só o Senado", async ({ page }) => {
  await page.goto("/votacoes?casa=senado");
  const feed = page.getByTestId("feed");
  await expect(feed.getByTestId("evento").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(feed).not.toContainText("Câmara dos Deputados ·");
  await expect(page.getByRole("link", { name: "Senado" })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("com lugar, mostra o voto de cada representante, inclusive quem não votou", async ({
  page,
}) => {
  await page.goto("/votacoes?lugar=5300108");
  await expect(page.getByTestId("lugar-do-feed")).toContainText(
    "de Brasília (DF)",
    { timeout: 15_000 },
  );
  const card = page
    .getByTestId("evento")
    .filter({ hasText: "Aprovado o projeto de teste." });
  const reps = card.getByTestId("votos-do-lugar");
  await expect(reps).toContainText("Deputado Teste A (PL): Não");
  await expect(reps).toContainText("Deputada Teste B: Não registrou voto");
});

test("página da votação: placar, orientações e tabelas", async ({ page }) => {
  await openVote(page, "Aprovado o projeto de teste.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "PL 11/2003",
  );
  await expect(page.getByTestId("placar-oficial")).toContainText(
    "Sim 300 · Não 150",
  );
  await expect(page.getByTestId("orientacoes")).toContainText("Governo: Sim");
  await expect(page.getByTestId("orientacoes")).toContainText("Oposição: Não");
  await expect(page.getByTestId("relevancia")).toBeVisible();
  await expect(page.getByTestId("por-partido")).toContainText("PL");
  await expect(page.getByTestId("por-uf")).toContainText("DF");
  await expect(page.getByTestId("lista-de-votos")).toContainText(
    "Deputado Teste A (PL-DF): Não",
  );
});

test("votação secreta e simbólica não mostram votos individuais", async ({
  page,
}) => {
  await page.goto(`/votacoes/${await voteId("senado", "97002")}`);
  await expect(page.getByTestId("sem-votos")).toContainText("Votação secreta", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("lista-de-votos")).toHaveCount(0);

  await openVote(page, "Aprovado requerimento simbólico de teste.");
  await expect(page.getByTestId("sem-votos")).toContainText(
    "Votação simbólica",
  );
});

// The panel e2e publishes a summary of PL 11/2003, so this reads a Senate vote nobody summarized.
test("votação sem resumo revisado diz isso", async ({ page }) => {
  await page.goto(`/votacoes/${await voteId("senado", "97001")}`);
  await expect(page.getByTestId("sem-resumo")).toHaveText(
    "O resumo desta votação ainda não foi revisado pela equipe.",
    { timeout: 15_000 },
  );
  await expect(page.getByTestId("lista-de-votos")).toContainText(
    "Senadora Teste Um (PL-DF): Ausente",
  );
});

test("votação inexistente responde 404", async ({ page }) => {
  for (const path of ["/votacoes/999999999", "/votacoes/abc"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  }
});

test("card da votação em PNG, com 404 para votação desconhecida", async ({
  page,
  request,
}) => {
  const path = await openVote(page, "Aprovado o projeto de teste.");
  const id = path.split("/").pop();
  const card = await request.get(`/cartao/votacao/${id}/link`);
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");
  const body = await card.body();
  expect(body.readUInt32BE(16)).toBe(1200);
  expect(body.readUInt32BE(20)).toBe(630);
  expect((await request.get("/cartao/votacao/999999999/link")).status()).toBe(
    404,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    new RegExp(`/cartao/votacao/${id}/link`),
  );
});

test("feed e página da votação sem violações de acessibilidade", async ({
  page,
}) => {
  const path = await openVote(page, "Aprovado o projeto de teste.");
  for (const url of ["/votacoes?lugar=5300108", path]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      ),
    ).toEqual([]);
  }
});
