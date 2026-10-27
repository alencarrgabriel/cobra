// Tira os prints P01–P15 do roteiro em formato celular (375x812 @3x = 1125x2436).
// Uso: com o app rodando em http://localhost:3000
//   npm install
//   npx playwright install chromium
//   npm run prints
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = new URL('./prints/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
  locale: 'pt-BR',
});
const page = await ctx.newPage();

// esconde o indicador do Next em modo dev
const limpar = () => page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});
const ir = async (path) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await limpar();
  await page.waitForTimeout(800);
};
const rolarAte = async (locator, folga = 16) => {
  await locator.first().scrollIntoViewIfNeeded();
  await page.evaluate((f) => {
    const el = document.activeElement; // noop
  }, folga);
  const box = await locator.first().boundingBox();
  if (box) await page.evaluate(([y, f]) => window.scrollBy(0, y - f - 56), [box.y, folga]);
  await page.waitForTimeout(600);
};
const print = async (nome) => {
  await page.screenshot({ path: OUT + nome + '.png' });
  console.log('ok', nome);
};

const passos = [
  ['P01', async () => { await ir('/'); }],
  ['P02', async () => { await ir('/'); await rolarAte(page.getByRole('heading', { name: /Explore pelo mapa/ })); }],
  ['P03', async () => {
    await ir('/');
    await page.getByPlaceholder('CEP, cidade ou UF').fill('70040-010');
  }],
  ['P04', async () => {
    await page.getByPlaceholder('CEP, cidade ou UF').press('Enter');
    await page.waitForURL(/representantes/);
    await page.waitForLoadState('networkidle');
    await limpar();
    await page.waitForTimeout(1200);
  }],
  ['P05', async () => { await rolarAte(page.getByRole('heading', { name: /Senadores/ })); }],
  ['P06', async () => {
    await page.getByText('Alberto Fraga', { exact: true }).first().click();
    await page.getByText('Ver perfil completo').waitFor();
    await page.waitForTimeout(800);
  }],
  ['P07', async () => { await ir('/obras'); }],
  ['P08', async () => {
    await ir('/obras');
    await rolarAte(page.getByRole('heading', { name: /Onde ficam/ }));
    await page.waitForTimeout(2500); // espera o mapa carregar
  }],
  ['P09', async () => {
    await ir('/obras?situacao=paralisada');
    await rolarAte(page.getByText(/obras? encontradas?/));
  }],
  ['P10', async () => { await ir('/obras/10930.53-87'); }],
  ['P11', async () => { await rolarAte(page.getByRole('heading', { name: /Prazos/ })); }],
  ['P12', async () => { await ir('/planos'); }],
  ['P13', async () => {
    await ir('/planos/2022-governador-df');
    await rolarAte(page.getByText(/Buscar uma palavra no plano/));
  }],
  ['P14', async () => {
    await ir('/planos/2022-governador-df?q=bombeiros');
    await rolarAte(page.getByText(/Busca por/));
  }],
  ['P15', async () => {
    await ir('/obras/10930.53-87');
    await page.getByRole('button', { name: /Compartilhar/ }).first().click();
    await page.waitForTimeout(1500);
  }],
];

for (const [nome, passo] of passos) {
  try { await passo(); await print(nome); }
  catch (e) { console.log('FALHOU', nome, '-', e.message.split('\n')[0]); }
}

await browser.close();
console.log('\nPrints em', OUT);
