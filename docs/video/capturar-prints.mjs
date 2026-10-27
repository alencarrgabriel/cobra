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
// espera um elemento VISÍVEL cujo texto bate com o padrão (o Next carrega em etapas)
const esperarVisivel = async (padrao, seletor = 'h1,h2,h3,button,a,span,p') => {
  await page.waitForFunction(([src, sel]) => {
    const re = new RegExp(src, 'i');
    return [...document.querySelectorAll(sel)].some(
      (e) => re.test(e.textContent.trim()) && e.getBoundingClientRect().height > 0);
  }, [padrao, seletor], { timeout: 20000 });
};
const rolarAte = async (padrao, seletor = 'h1,h2,h3,span,p') => {
  await esperarVisivel(padrao, seletor);
  await page.evaluate(([src, sel]) => {
    const re = new RegExp(src, 'i');
    const el = [...document.querySelectorAll(sel)].find(
      (e) => re.test(e.textContent.trim()) && e.getBoundingClientRect().height > 0);
    el.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -64);
  }, [padrao, seletor]);
  await page.waitForTimeout(900);
};
const clicarTexto = async (padrao, seletor = 'button') => {
  await esperarVisivel(padrao, seletor);
  await page.evaluate(([src, sel]) => {
    const re = new RegExp(src, 'i');
    const el = [...document.querySelectorAll(sel)].find(
      (e) => re.test(e.textContent.trim()) && e.getBoundingClientRect().height > 0);
    el.scrollIntoView({ block: 'center' });
    el.click();
  }, [padrao, seletor]);
  await page.waitForTimeout(1200);
};
const print = async (nome) => {
  await page.screenshot({ path: OUT + nome + '.png' });
  console.log('ok', nome);
};

const REP = '/representantes/5300108';
const OBRA = '/obras/10930.53-87';
const passos = [
  ['P01', async () => { await ir('/'); }],
  ['P02', async () => { await ir('/'); await rolarAte('^Explore pelo mapa'); }],
  ['P03', async () => {
    await ir('/');
    await page.getByPlaceholder('CEP, cidade ou UF').fill('70040-010');
  }],
  ['P04', async () => { await ir(REP); await esperarVisivel('^Senadores'); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600); }],
  ['P05', async () => { await ir(REP); await rolarAte('^Senadores', 'h2'); }],
  ['P06', async () => {
    await ir(REP);
    await clicarTexto('^Alberto Fraga', 'button');
    await esperarVisivel('Ver perfil completo', 'a');
    await page.waitForTimeout(800);
  }],
  ['P07', async () => { await ir('/obras'); }],
  ['P08', async () => {
    await ir('/obras');
    await rolarAte('^Onde ficam', 'h2');
    await page.waitForTimeout(2500); // espera o mapa carregar
  }],
  ['P09', async () => { await ir('/obras?situacao=paralisada'); await rolarAte('obras? encontradas?', 'h2'); }],
  ['P10', async () => { await ir(OBRA); }],
  ['P11', async () => { await ir(OBRA); await rolarAte('^Prazos$', 'h2'); }],
  ['P12', async () => { await ir('/planos'); }],
  ['P13', async () => { await ir('/planos/2022-governador-df'); await rolarAte('^Buscar uma palavra no plano', 'label,span,p,h2,h3'); }],
  ['P14', async () => { await ir('/planos/2022-governador-df?q=bombeiros'); await rolarAte('^Busca por', 'h2,h3,p,span'); }],
  ['P15', async () => {
    await ir(OBRA);
    await clicarTexto('^Compartilhar$', 'button');
    await page.waitForTimeout(800);
  }],
];

// rode só alguns: npm run prints -- P05 P06
const so = process.argv.slice(2).map((x) => x.toUpperCase());

for (const [nome, passo] of passos) {
  if (so.length && !so.includes(nome)) continue;
  try { await passo(); await print(nome); }
  catch (e) { console.log('FALHOU', nome, '-', e.message.split('\n')[0]); }
}

await browser.close();
console.log('\nPrints em', OUT);
