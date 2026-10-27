# Tasks

## 1. Banco e amostras

- [x] 1.1 Migração: `core.government_plans`, `core.government_plan_pages` (busca em português), `core.plan_page_themes`, `core.plan_themes` com os temas e as áreas de obra (D2, D4); `docs/modelo-de-dados.md`
- [x] 1.2 Dependência `pypdf` 6.20.1; amostra reduzida do CSV de candidatos de 2022 (DF e BR) sem colunas pessoais

## 2. Coletor

- [x] 2.1 `sources/tse_planos_model.py`: escolha da chapa eleita, extração por página, temas (D1, D4, D5); testes sem banco com PDF gerado no teste
- [x] 2.2 `sources/tse_planos.py`, registro no `REGISTRY`; testes com banco: carga, segunda carga igual, hash conferido, busca em português, sem CPF, não eleito ignorado

## 3. Integração final

- [x] 3.1 `docs/coleta.md`; carga real local (planos de 2022 do presidente e do governador do DF); conferir páginas e temas; `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
