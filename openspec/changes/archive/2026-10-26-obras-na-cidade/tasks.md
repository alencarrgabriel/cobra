# Tasks

## 1. Dados no site

- [x] 1.1 `WEB_DATABASE_URL` opcional no esquema e no `.env.example`; `web/src/lib/db.ts` com postgres.js e `DataUnavailableError`; teste Vitest: sem a variável, a consulta lança o erro de dados indisponíveis
- [x] 1.2 Banco de teste para o Playwright (`e2e/db/setup.ts` + `seed.sql`) e serviço Postgres no job do site no CI; verificar que o setup recria `cobra_e2e` e que a rota de saúde continua passando
- [x] 1.3 Consultas em `web/src/lib/works/` (resumo, lista filtrada e paginada, pinos, ficha, data da base) e conversão de filtros da URL; testes Vitest dos filtros (valores válidos, inválidos e padrão) e formatação de valores e meses

## 2. Componentes

- [x] 2.1 `WorkStatus` (selo com rótulo e cor da situação, "há N meses" para paralisada) e `WorksMap` (SVG do DF, pinos-link, legenda, contagem sem localização) com `df-boundary.json` do IBGE; testes Vitest de projeção (pino dentro do DF) e do selo

## 3. Páginas

- [x] 3.1 `/obras` com resumo, filtros, mapa, lista e paginação, dentro de `<Suspense>`, e aviso de dados indisponíveis; seção "Obras" ativa na navegação; testes Playwright: resumo bate com o seed, filtro de situação e de área pelo endereço, ordem por nome, contagem sem localização
- [x] 3.2 `/obras/[codigo]` com a ficha completa e `generateMetadata`; testes Playwright: obra paralisada com meses e justificativa, nota de qualidade, link da fonte, 404 para código inexistente
- [x] 3.3 Acessibilidade (axe) em `/obras` e numa ficha nos dois temas; ajustar a navegação nos testes existentes (Obras deixa de ser "em breve")

## 4. Integração final

- [x] 4.1 Ver as páginas com os dados reais do banco local (1.147 obras) no celular e no computador; rodar `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
