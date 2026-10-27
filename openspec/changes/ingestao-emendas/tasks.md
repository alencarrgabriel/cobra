# Tasks

## 1. Banco e amostras

- [x] 1.1 Migração: fonte `transparencia`, tabelas `core.amendment_authors`, `core.amendments`, `core.work_commitments`, visão `core.work_amendment_links` e função `core.amendments_by_function` (D1, D2, D6); `docs/modelo-de-dados.md`
- [x] 1.2 Amostras reais em `collectors/tests/fixtures/transparencia/` (CSV reduzido) e `collectors/tests/fixtures/obrasgov/empenho-*.json`

## 2. Coletores

- [x] 2.1 `sources/transparencia_model.py` e `sources/transparencia.py` (D1, D3): leitura do CSV, filtro do DF, soma por código, tipo de autor, ligação com político; testes sem banco e com banco (carga, segunda carga, autor ligado, bancada sem político, linhas sem código)
- [x] 2.2 Tarefa `commitments` no adaptador `obrasgov` e reconhecimento do identificador da emenda (D4, D5); testes: vínculo direto por código e por autor com número, identificador sem correspondência, emendas por função

## 3. Integração final

- [x] 3.1 `docs/coleta.md`; carga real local (emendas do DF e empenhos das 1.147 obras); conferir os vínculos diretos; `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
