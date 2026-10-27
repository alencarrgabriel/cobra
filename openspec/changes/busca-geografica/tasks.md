# Tasks

## 1. Busca

- [x] 1.1 `lib/geo/cep.ts` (D1) e `lib/places/` (D2: normalização e resolução, consultas de UF e município); testes Vitest
- [x] 1.2 Route Handler `POST /buscar` (D3) e página `/representantes` (formulário, escolha entre homônimos, mensagem de não encontrado); formulário da página inicial ativado

## 2. Página do lugar

- [x] 2.1 `lib/representatives/queries.ts` (D4) e página `/representantes/[codigo]` com as seções, avisos (RF-04 a RF-06), fonte e data, filtro por partido e 404 pelo Proxy
- [x] 2.2 `RepresentativesGrid` com painel de resumo e links oficiais (D5); fotos pelo próprio site (D6); lugar lembrado (D7); "Representantes" ativo na navegação

## 3. Testes e integração

- [x] 3.1 Seed do banco de teste e testes Playwright (D8), axe nos dois temas; ajuste dos testes de navegação
- [x] 3.2 Ver com os dados reais (Brasília: 3 + 8 + 24; São Paulo) no celular e no computador; `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
