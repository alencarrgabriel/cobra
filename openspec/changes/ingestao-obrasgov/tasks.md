# Tasks

## 1. Banco

- [ ] 1.1 Migração: valor `obrasgov` em `core.data_source`, município 5300108 (Brasília), enum `core.work_status` e tabelas `core.works`, `core.work_progress`, `core.work_status_events`, `core.work_localities`; testes de banco: rastreabilidade das tabelas novas (teste de metadados), obra aceita com fonte `obrasgov`, evento repetido rejeitado, leitor do site lê obras e não escreve

## 2. Adaptador

- [ ] 2.1 Normalização pura (sem banco): obra da API → linha de `works`, execução → `work_progress`, histórico → eventos distintos, mapa de situações; testes com as amostras reais gravadas, incluindo os 129 eventos repetidos e obra sem pino
- [ ] 2.2 Validação da obra (D4); testes de cada regra, inclusive o cenário de 140%
- [ ] 2.3 Adaptador `obrasgov` (`plan`, tarefas `projects`, `detail`, `geometry`, paginação pela própria fonte, data da base) registrado no `REGISTRY`; testes de banco com `MockTransport` e as amostras: carga completa, recoleta sem duplicar com mudança de situação, página com obra inválida não publica

## 3. Integração final

- [ ] 3.1 Carga real do DF no banco local (`enqueue` + `work`), conferindo contagens contra a API e registrando o resultado; atualizar `docs/modelo-de-dados.md` e `docs/coleta.md`; rodar `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
