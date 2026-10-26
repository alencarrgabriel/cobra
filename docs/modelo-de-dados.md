# Modelo de dados

Referência técnica do banco do Cobra. A fonte da verdade são as migrações em `supabase/migrations/`; este documento explica as convenções. Requisitos: DDR cap. 7, RNF-16 e §10.1.

## Esquemas

| Esquema | O que guarda | Quem acessa |
|---|---|---|
| `core` | Dados públicos normalizados e validados. É o que o site lê. | `cobra_web_reader` (leitura), `cobra_collector` (leitura e escrita) |
| `restricted` | Dados usados só para cruzar fontes, como o CPF de políticos. Nunca exibidos. | `cobra_collector` |

Nenhum dos dois é exposto pela API REST automática do Supabase. O site lê o banco pelo servidor, com o papel `cobra_web_reader`.

Um dado só entra em `core` dentro de uma transação que já passou pelas validações da coleta. Por isso `core` é ao mesmo tempo a camada normalizada e a publicada (DDR §6.2). A camada bruta (`raw`) chega com a change `infra-coleta`.

## Rastreabilidade (obrigatória em toda tabela de `core` e `restricted`)

| Coluna | Tipo | Obrigatória | Significado |
|---|---|---|---|
| `source` | `core.data_source` | sim | Fonte oficial: `camara`, `senado`, `tse`, `cldf`, `ibge`, `obrasgov` ou `cobra` (curadoria do projeto) |
| `source_id` | `text` | não | Identificador do registro na fonte |
| `source_url` | `text` | não | Link para conferir na fonte |
| `collected_at` | `timestamptz` | sim | Quando o Cobra coletou o dado |
| `source_updated_at` | `timestamptz` | não | Última atualização informada pela fonte |

Quando o registro tem identificador próprio na fonte, a tabela tem `unique (source, source_id)`, e os coletores usam `insert ... on conflict (source, source_id) do update`.

O teste `collectors/tests/db/test_provenance.py` reprova qualquer tabela desses esquemas sem essas colunas.

## Tabelas

| Tabela | Conteúdo | Regras principais |
|---|---|---|
| `core.localities` | UFs (código IBGE de 2 dígitos) e municípios (7 dígitos) | As 27 UFs e Brasília (5300108) vêm nas migrações; o código do município começa pelo da UF |
| `core.legislative_houses` | Câmara, Senado e CLDF | `slug` único; a CLDF é `district` e ligada à UF `53` |
| `core.parties` | Partidos | `acronym` único; `electoral_number` pode repetir (números são reaproveitados) |
| `core.politicians` | Uma linha por pessoa, qualquer que seja o número de fontes | — |
| `core.politician_external_ids` | IDs de cada político na Câmara, Senado, TSE e CLDF | `unique (system, external_id)`; o TSE gera um sequencial por eleição, então pode haver vários |
| `restricted.politician_private_ids` | CPF do político, para cruzar fontes | 11 dígitos; o site não tem acesso |
| `core.party_affiliations` | Histórico de filiações | No máximo uma filiação aberta (`ended_on is null`) por político |
| `core.mandates` | Mandatos: político, casa, cargo (`office`), localidade, período e situação (`status`) | Sem sobreposição de períodos do mesmo cargo para a mesma pessoa |
| `core.works` | Obras com recurso federal (Obrasgov.br): nome, endereço, área, situação, quem repassa, recebe e executa, valor previsto, prazos, coordenadas, percentual de execução mais recente | Situação em `core.work_status`; percentual entre 0 e 100; término previsto não antes do início |
| `core.work_progress` | Registros de execução física de cada obra | Percentual entre 0 e 100 |
| `core.work_status_events` | Histórico de paralisação e cancelamento, com a justificativa oficial | Um evento por (obra, situação, data, justificativa): a fonte repete eventos com ids diferentes |
| `core.work_localities` | Municípios de cada obra (geometria do Obrasgov) | Chave (obra, município) |

Chaves: `id bigint generated always as identity`, exceto `core.localities` (chave = `ibge_code`) e `restricted.politician_private_ids` (chave = `politician_id`). Chaves estrangeiras usam `on delete restrict`: dado oficial não some em cascata.

## Papéis e usuários

As migrações criam os papéis `cobra_web_reader` e `cobra_collector` sem login e sem senha, e dão a eles os privilégios, inclusive para tabelas futuras (`alter default privileges`).

Usuários com login são criados por ambiente, fora do repositório, com a senha guardada no gerenciador de segredos da hospedagem:

```sql
create role cobra_web login password '<senha gerada>';
grant cobra_web_reader to cobra_web;

create role cobra_etl login password '<senha gerada>';
grant cobra_collector to cobra_etl;
```

A `DATABASE_URL` de cada ambiente usa o usuário correspondente. No Supabase local, os coletores usam o superusuário `postgres`.

## Migrações e testes

- `pnpm db:reset` recria o banco local aplicando todas as migrações.
- `pnpm check:db` cria um banco descartável (`cobra_test_<aleatório>`), aplica as migrações, roda os testes de `collectors/tests/db/` e apaga o banco. O banco de desenvolvimento não é alterado.
- No CI, os mesmos testes rodam contra um Postgres 17 puro. O teste do papel `anon` (exclusivo do Supabase) é pulado lá.
