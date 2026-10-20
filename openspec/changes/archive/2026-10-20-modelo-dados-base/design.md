# Design

## Context

O banco local (Supabase CLI, Postgres 17) existe, mas não tem nenhuma migração. Os coletores (Python) vão gravar e o site (Next.js, no servidor) vai ler as mesmas tabelas. O DDR (§6.2) pede três camadas: bruta → normalizada → publicada. A camada bruta e a fila nascem em `infra-coleta`; esta change define onde ficam os dados normalizados e publicados. Motivação e escopo: ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Fixar as convenções que todas as tabelas futuras seguem: esquema, chaves, rastreabilidade, papéis e testes.
- Entregar o núcleo de dados de representantes com integridade garantida pelo próprio banco, e não só pelo código dos coletores.

**Non-Goals:**
- Municípios, proposições, votações, presença, despesas, dados do TSE, eventos, resumos editoriais e usuários (cada um na change que o usa).
- Slugs e links permanentes de perfil (change `perfil-do-politico`).
- Histórico de mudanças de situação dentro de um mesmo mandato (ex.: idas e voltas de licença).

## Decisions

### D1. Esquemas `core` e `restricted`, fora da API automática
- `core`: dados públicos normalizados que o site lê.
- `restricted`: dados de políticos que servem só para cruzar fontes (CPF). O site não tem acesso a ele.
- A camada bruta ganha o esquema `raw` em `infra-coleta`. Tabelas de usuários terão esquema próprio em `alertas-email`.
- Nenhum dos esquemas entra em `api.schemas` do Supabase: o site lê pelo servidor com um papel próprio, sem a API REST automática nem a chave anônima.
- Alternativa: tabelas em `public` protegidas por RLS. Rejeitada: um esquecimento de RLS expõe dados pela API automática, e não usamos essa API.

### D2. "Publicado" = linha em `core` gravada após validação
Coletores gravam em `core` só dentro de uma transação que já passou pelas validações do DDR §6.2. Uma coleta reprovada não altera nada em `core`. Assim `core` é ao mesmo tempo a camada normalizada e a publicada.
- Alternativa: esquema `published` com cópias ou visões filtradas de `core`. Rejeitada por ora: duplica tabelas e escrita sem ganho enquanto a validação é por transação. Se surgir necessidade de "rascunho de dado", entra uma coluna ou um esquema de preparação em `infra-coleta`.

### D3. Chaves
- Tabelas: `id bigint generated always as identity`.
- Exceção: `localities`, cuja chave é o código IBGE (`text`: 2 dígitos para UF, 7 para município). É estável, legível e evita uma tabela de-para.
- Alternativa: UUID. Rejeitada: sem geração distribuída nem exposição de IDs em URL (o perfil terá slug).

### D4. Rastreabilidade como colunas padrão
Toda tabela de `core` e de `restricted` tem:

| Coluna | Tipo | Obrigatória |
|---|---|---|
| `source` | `core.data_source` (enum: `camara`, `senado`, `tse`, `cldf`, `ibge`, `cobra`) | sim |
| `source_id` | `text` | não (nem todo registro tem ID próprio na fonte) |
| `source_url` | `text` | não |
| `collected_at` | `timestamptz` | sim |
| `source_updated_at` | `timestamptz` | não |

Onde o registro tem ID próprio na fonte, há `unique (source, source_id)`. É o que permite ao coletor fazer `insert ... on conflict do update`.

Um teste de meta-dados percorre o `information_schema` e falha se alguma tabela desses esquemas não tiver as colunas com tipo e obrigatoriedade corretos. Assim a regra vale automaticamente para as changes seguintes.
- Alternativa: tabela central de "proveniência" referenciada por FK. Rejeitada: um join a mais em toda leitura do site e risco de linhas órfãs.
- Alternativa: tabela de fontes no lugar do enum. Rejeitada: as fontes mudam raramente; `alter type ... add value` basta.

### D5. Tabelas
```
core.localities            ibge_code PK, kind(uf|municipality), name, uf_code(→localities), uf_abbr
core.legislative_houses    id, slug unique(camara|senado|cldf), name, level(federal|state|district|municipal), locality_code
core.parties               id, acronym unique, name, electoral_number (sem unique)
core.politicians           id, civil_name, parliamentary_name, birth_date, photo_url
core.politician_external_ids
                           id, politician_id, system(camara|senado|tse|cldf), external_id,
                           unique(system, external_id)
restricted.politician_private_ids
                           politician_id PK, cpf text unique, check(exatamente 11 dígitos)
core.party_affiliations    id, politician_id, party_id, started_on, ended_on,
                           check(ended_on >= started_on),
                           unique parcial (politician_id) where ended_on is null
core.mandates              id, politician_id, house_id, office(deputado_federal|senador|deputado_distrital),
                           locality_code, legislature, started_on, ended_on, status(titular|suplente|licenciado),
                           check(ended_on >= started_on),
                           exclude using gist (politician_id =, office =, daterange(started_on, ended_on, '[]') &&)
```
Todas com as colunas de D4. FKs com `on delete restrict`: dados oficiais não somem em cascata.
- O sequencial do TSE muda a cada eleição, então um político pode ter vários IDs `tse`. A unicidade é por par sistema e ID, não por político e sistema.
- O CPF é o elo estável entre TSE, Câmara e Senado (§6.2), mas não é exibido (§10.1). Por isso fica em `restricted`.
- A não sobreposição de mandatos usa `btree_gist`, extensão padrão do Postgres disponível no Supabase.

### D6. Papéis sem login, criados de forma idempotente
- `cobra_web_reader`: `usage` em `core`; `select` em todas as tabelas, inclusive as futuras (via `alter default privileges`).
- `cobra_collector`: `usage` em `core` e `restricted`; `select, insert, update, delete` em todas as tabelas e `usage` nas sequências, também via privilégios padrão. Sem `create` nos esquemas.
- Ambos `nologin` e sem senha. Papéis são globais no servidor Postgres, então a migração usa `do $$ ... if not exists ... $$`. Isso deixa reaplicar seguro em bancos de teste e branches do Supabase.
- Login por ambiente: um usuário com senha (gerenciador de segredos), `grant cobra_web_reader to <usuario>`. O `docs/modelo-de-dados.md` traz o passo a passo. Localmente os coletores usam o superusuário do Supabase local.

### D7. Dados fixos na própria migração
As 27 UFs (fonte `ibge`, códigos da tabela oficial do IBGE: https://www.ibge.gov.br/explica/codigos-dos-municipios.php, consultada em 2026-10-20) e as 3 casas (fonte `cobra`) são inseridas na migração com `collected_at = now()`. Elas precisam existir em todo ambiente, inclusive produção, enquanto o `seed.sql` do Supabase só roda localmente.

### D8. Testes de banco com pytest num banco descartável
- `collectors/tests/db/`, marcador `db`, excluído do `pytest` padrão. O comando `pnpm check:db` roda só esses testes, e `pnpm check` passa a incluí-lo.
- Uma fixture de sessão conecta em `TEST_DATABASE_URL` (Postgres de administração; padrão: Supabase local), cria `cobra_test_<aleatório>`, aplica os arquivos de `supabase/migrations/` em ordem e apaga o banco no fim. O banco de desenvolvimento não é tocado.
- Cada teste roda numa transação desfeita ao final. Papéis são testados com `set local role`.
- O teste do papel anônimo (`anon`) só roda onde o papel existe (Supabase local); no CI com Postgres puro ele é pulado com aviso.
- O pytest-socket passa a liberar só `127.0.0.1`, `localhost` e `::1`; APIs externas continuam bloqueadas.
- Driver: `psycopg` 3, que os coletores usarão em seguida.
- Alternativa: pgTAP via `supabase test db`. Rejeitada: segunda linguagem de teste e Supabase completo no CI; o pytest já é a ferramenta dos coletores.
- Risco aceito: as migrações são aplicadas pelo teste, não pelo Supabase CLI. Mitigação: SQL puro, sem comandos do psql, e `pnpm db:reset` (Supabase CLI) documentado e rodado na verificação manual.

### D9. CI
Novo job `database`: serviço `postgres:17` (com `btree_gist`), `uv sync --locked`, `uv run pytest -m db` com `TEST_DATABASE_URL` apontando para o serviço.

## Risks / Trade-offs

- [Sigla de partido única não representa siglas reutilizadas em épocas diferentes] → Raro no período coberto. Se aparecer em dados históricos do TSE, troca-se a unicidade por (sigla, período) em migração própria.
- [Mudanças de situação no meio do mandato ficam só como situação atual] → Suficiente para "quem representa hoje"; o histórico fino entra se o perfil precisar (RF-27 pede partidos e cargos, não licenças).
- [Privilégios padrão valem só para tabelas criadas pelo dono das migrações] → As migrações sempre rodam como `postgres`; o teste de meta-dados confere as permissões efetivas de cada tabela.
- [`pnpm check` agora exige o Supabase local rodando] → Mensagem clara quando o banco não responde; `check:web` e `check:collectors` continuam separados.

## Migration Plan

Primeira migração; não há dados. Local: `pnpm db:reset`. Produção: `supabase db push` quando houver projeto remoto (fora desta change). Rollback: em banco sem dados, recriar; com dados, migração corretiva nova (nunca editar migração já aplicada).
