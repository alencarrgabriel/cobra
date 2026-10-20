# Tasks

## 1. Infraestrutura de testes de banco

- [x] 1.1 Adicionar `psycopg[binary]` aos coletores, marcador `db` (fora do `pytest` padrão), liberação de rede só para `127.0.0.1`, `localhost` e `::1`, `TEST_DATABASE_URL` no `.env.example`; verificar que `uv run pytest` continua passando e que `test_no_network` segue bloqueando hosts externos
- [x] 1.2 Criar fixture de sessão em `collectors/tests/db/conftest.py` que cria banco `cobra_test_<aleatório>`, aplica `supabase/migrations/*.sql` em ordem e apaga o banco ao final, mais fixture de transação desfeita por teste; verificar com um teste que roda com zero migrações e confirma que o banco de desenvolvimento não foi alterado
- [x] 1.3 Adicionar scripts `db:reset` e `check:db` na raiz e incluir `check:db` em `pnpm check`, com mensagem clara se o banco não responder; verificar rodando `pnpm check:db` com e sem `pnpm db:start`

## 2. Esquemas, rastreabilidade e papéis

- [x] 2.1 Criar a migração `<timestamp>_core_base.sql` com extensão `btree_gist`, esquemas `core` e `restricted`, enum `core.data_source` e papéis `cobra_web_reader` e `cobra_collector` (idempotentes, `nologin`) com privilégios padrão (design D1, D4, D6); verificar com `pnpm db:reset` aplicando sem erro
- [x] 2.2 Escrever o teste de meta-dados de rastreabilidade (toda tabela de `core`/`restricted` tem as 5 colunas com tipos e obrigatoriedade corretos) e o teste que procura senha ou `login` nas migrações; verificar que passam e que uma tabela de teste sem as colunas faz o primeiro falhar

## 3. Tabelas do núcleo

- [x] 3.1 Adicionar à migração `localities` e `legislative_houses` com a carga das 27 UFs (fonte IBGE) e das 3 casas; testes: DF com código `53`, total de 27 UFs, CLDF distrital ligada à UF 53, fonte e data de coleta das UFs preenchidas, fonte desconhecida rejeitada
- [x] 3.2 Adicionar `parties`, `politicians`, `politician_external_ids` e `restricted.politician_private_ids`; testes: sigla repetida rejeitada, número eleitoral repetido aceito, mesmo político achado por ID da Câmara e do TSE, ID externo duplicado rejeitado, político sem `collected_at` rejeitado, recoleta do mesmo `(source, source_id)` rejeitada como inserção e aceita com `on conflict do update`
- [x] 3.3 Adicionar `party_affiliations` e `mandates`; testes: troca de partido com filiação atual identificável, segunda filiação aberta rejeitada, data de fim antes do início rejeitada, mandato de deputado federal pela UF 53 encontrado na consulta por UF e casa, mandatos sobrepostos rejeitados, localidade inexistente rejeitada, mandato sem fonte rejeitado

## 4. Acesso

- [x] 4.1 Testes de papéis: leitor lê mandatos e não insere/altera/apaga; leitor não lê `restricted.politician_private_ids`; coletor insere partido e não cria/apaga tabela; `anon` sem acesso a `core` (pulado onde o papel não existe); verificar que passam no Supabase local sem pulos

## 5. CI e documentação

- [x] 5.1 Adicionar job `database` ao `ci.yml` (serviço `postgres:17`, `uv run pytest -m db`); verificar com `actionlint`
- [x] 5.2 Escrever `docs/modelo-de-dados.md` (esquemas, tabelas, convenção de rastreabilidade, papéis e como criar usuários com login por ambiente) e a seção de banco no `CONTRIBUTING.md` (migrações nunca editadas depois de aplicadas, nomes em inglês e `snake_case`); verificar que todo nome de tabela e coluna citado existe na migração

## 6. Integração final

- [x] 6.1 Rodar `pnpm db:reset`, `pnpm check` (agora com `check:db`) e `pnpm check:secrets`; registrar a saída no resumo da change

## Workflow follow-up

- Revisar com o responsável e só então arquivar a change.
