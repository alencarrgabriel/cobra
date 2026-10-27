# Tasks

## 1. Amostras e modelo

- [x] 1.1 Gravar páginas reais em `collectors/tests/fixtures/cldf/`: lista da legislatura atual e perfis de Chico Vigilante, Jorge Vianna, Doutora Jane e Roberio Negreiros
- [x] 1.2 `sources/cldf_model.py`: leitura da lista e do perfil (D2), partido (D3), validações (D4), mandato (D5); testes sem banco com as páginas gravadas

## 2. Adaptador

- [x] 2.1 `sources/cldf.py` com as tarefas `list` e `deputy` (D1), publicação numa transação, identidade única (D6), saída da lista (D5), registro no `REGISTRY`; testes com banco: carga completa, segunda carga igual, partido extinto, página que mudou de formato, deputado que saiu, ligação com político da Câmara

## 3. Integração final

- [x] 3.1 `docs/coleta.md` com a seção da CLDF; carga real local conferida contra o site (24 deputados); `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
