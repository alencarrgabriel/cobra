# Tasks

## 1. Amostras e modelo

- [ ] 1.1 Gravar respostas reais em `collectors/tests/fixtures/senado/`: listas atual e de afastados reduzidas (3 do DF, suplente em exercício, titular afastado, suplente que voltou à suplência), detalhe e filiações desses senadores
- [ ] 1.2 `sources/senado_model.py`: normalização de político, UF, participação, mandato e saída (D2 a D4), filiações (D5), nome civil normalizado (D6) e validações; testes sem banco com as amostras

## 2. Adaptador

- [ ] 2.1 `sources/senado.py` com as tarefas `senators` e `senator` (D1), publicação numa transação, identidade única (D6), registro no `REGISTRY`; testes com banco: carga completa, segunda carga igual, ligação com político da Câmara, UF desconhecida
- [ ] 2.2 Afastamento e saída (D4) e filiações com datas (D5); testes com banco: titular afastado, suplente que saiu, lista de afastados indisponível, troca de partido

## 3. Integração final

- [ ] 3.1 `docs/coleta.md` com a seção do Senado; carga real local conferida contra a API (81 senadores, 3 por UF); `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
