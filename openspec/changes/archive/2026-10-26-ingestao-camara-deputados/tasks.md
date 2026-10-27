# Tasks

## 1. Amostras e modelo

- [x] 1.1 Gravar respostas reais em `collectors/tests/fixtures/camara/` (lista do DF, inteira e em páginas de 5 para testar a paginação, detalhe e histórico de titular, suplente e licenciado, partidos), com CPF fictício
- [x] 1.2 `sources/camara_model.py`: normalização de político, partido, UF, situação e início do mandato (D2, D3) e validações (D5); testes sem banco com as amostras

## 2. Adaptador

- [x] 2.1 `sources/camara.py` com as tarefas `deputies-page` e `deputy` (D1), publicação numa transação (político, ids, CPF restrito, partido, filiação, mandato), registro no `REGISTRY`; testes com banco: carga completa, segunda carga igual, CPF só em `restricted`, UF desconhecida
- [x] 2.2 Troca de partido (D6) e tarefa `close-mandates` (D4), que não roda com lista incompleta; testes com banco

## 3. Integração final

- [x] 3.1 `docs/coleta.md` com a seção da Câmara; carga real local conferida contra o total da API (513, 8 do DF); `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
