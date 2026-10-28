# Modelo de dados

Referência técnica do banco do Cobra. A fonte da verdade são as migrações em `supabase/migrations/`; este documento explica as convenções. Requisitos: DDR cap. 7, RNF-16 e §10.1.

## Esquemas

| Esquema      | O que guarda                                                                 | Quem acessa                                                         |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `core`       | Dados públicos normalizados e validados. É o que o site lê.                  | `cobra_web_reader` (leitura), `cobra_collector` (leitura e escrita) |
| `restricted` | Dados usados só para cruzar fontes, como o CPF de políticos. Nunca exibidos. | `cobra_collector`                                                   |

Nenhum dos dois é exposto pela API REST automática do Supabase. O site lê o banco pelo servidor, com o papel `cobra_web_reader`.

Um dado só entra em `core` dentro de uma transação que já passou pelas validações da coleta. Por isso `core` é ao mesmo tempo a camada normalizada e a publicada (DDR §6.2). A camada bruta (`raw`) chega com a change `infra-coleta`.

## Rastreabilidade (obrigatória em toda tabela de `core` e `restricted`)

| Coluna              | Tipo               | Obrigatória | Significado                                                                                            |
| ------------------- | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------ |
| `source`            | `core.data_source` | sim         | Fonte oficial: `camara`, `senado`, `tse`, `cldf`, `ibge`, `obrasgov` ou `cobra` (curadoria do projeto) |
| `source_id`         | `text`             | não         | Identificador do registro na fonte                                                                     |
| `source_url`        | `text`             | não         | Link para conferir na fonte                                                                            |
| `collected_at`      | `timestamptz`      | sim         | Quando o Cobra coletou o dado                                                                          |
| `source_updated_at` | `timestamptz`      | não         | Última atualização informada pela fonte                                                                |

Quando o registro tem identificador próprio na fonte, a tabela tem `unique (source, source_id)`, e os coletores usam `insert ... on conflict (source, source_id) do update`.

O teste `collectors/tests/db/test_provenance.py` reprova qualquer tabela desses esquemas sem essas colunas.

## Tabelas

| Tabela                              | Conteúdo                                                                                                                                                                          | Regras principais                                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core.localities`                   | UFs (código IBGE de 2 dígitos) e municípios (7 dígitos)                                                                                                                           | As 27 UFs e Brasília (5300108) vêm nas migrações; o código do município começa pelo da UF                                                                                                               |
| `core.legislative_houses`           | Câmara, Senado e CLDF                                                                                                                                                             | `slug` único; a CLDF é `district` e ligada à UF `53`                                                                                                                                                    |
| `core.parties`                      | Partidos                                                                                                                                                                          | `acronym` único; `electoral_number` pode repetir (números são reaproveitados)                                                                                                                           |
| `core.party_colors`                 | Cor de identificação de cada partido em atividade, curada pelo Cobra                                                                                                              | Chave = sigla, ligada a `parties` pela sigla; `basis` registra se a cor vem do `theme-color` do site oficial, do CSS do site ou de identidade conhecida a confirmar; partido sem linha usa a cor neutra |
| `core.politicians`                  | Uma linha por pessoa, qualquer que seja o número de fontes                                                                                                                        | —                                                                                                                                                                                                       |
| `core.politician_external_ids`      | IDs de cada político na Câmara, Senado, TSE e CLDF                                                                                                                                | `unique (system, external_id)`; o TSE gera um sequencial por eleição, então pode haver vários                                                                                                           |
| `restricted.politician_private_ids` | CPF do político, para cruzar fontes                                                                                                                                               | 11 dígitos; o site não tem acesso                                                                                                                                                                       |
| `core.party_affiliations`           | Histórico de filiações                                                                                                                                                            | No máximo uma filiação aberta (`ended_on is null`) por político                                                                                                                                         |
| `core.mandates`                     | Mandatos: político, casa, cargo (`office`), localidade, período e situação (`status`)                                                                                             | Sem sobreposição de períodos do mesmo cargo para a mesma pessoa                                                                                                                                         |
| `core.works`                        | Obras com recurso federal (Obrasgov.br): nome, endereço, área, situação, quem repassa, recebe e executa, valor previsto, prazos, coordenadas, percentual de execução mais recente | Situação em `core.work_status`; percentual entre 0 e 100; término previsto não antes do início                                                                                                          |
| `core.work_progress`                | Registros de execução física de cada obra                                                                                                                                         | Percentual entre 0 e 100                                                                                                                                                                                |
| `core.work_status_events`           | Histórico de paralisação e cancelamento, com a justificativa oficial                                                                                                              | Um evento por (obra, situação, data, justificativa): a fonte repete eventos com ids diferentes                                                                                                          |
| `core.work_localities`              | Municípios de cada obra (geometria do Obrasgov)                                                                                                                                   | Chave (obra, município)                                                                                                                                                                                 |

Chaves: `id bigint generated always as identity`, exceto `core.localities` (chave = `ibge_code`) e `restricted.politician_private_ids` (chave = `politician_id`). Chaves estrangeiras usam `on delete restrict`: dado oficial não some em cascata.

### Emendas (change `ingestao-emendas`)

| Tabela                                     | O que guarda                                                                | Regras                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `core.amendment_authors`                   | Autor de emenda no orçamento federal (código, nome, tipo)                   | `kind` individual, bancada, comissão ou relator; `politician_id` só quando o nome casa com exatamente um deputado ou senador |
| `core.amendments`                          | Emenda com destino ao DF, uma por código de 12 dígitos (ano, autor, número) | Valores empenhado, liquidado e pago somados das linhas da fonte; `main_function` = função da linha de maior valor            |
| `core.work_commitments`                    | Empenhos de cada obra (Obrasgov)                                            | `amendment_ref_raw` como veio; `amendment_code` reconhecido (12 dígitos) ou nulo                                             |
| `core.work_amendment_links` (visão)        | Vínculo obra–emenda, grau "direto"                                          | Empenho da obra que identifica uma emenda guardada                                                                           |
| `core.amendments_by_function(uf)` (função) | Emendas de um lugar por área                                                | Contagem e somas; não liga cada obra a cada emenda                                                                           |

### Planos de governo (change `ingestao-planos-de-governo`)

| Tabela                       | O que guarda                                                              | Regras                                                                       |
| ---------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `core.government_plans`      | Plano registrado no TSE pela chapa eleita (presidente; governador por UF) | PDF oficial byte a byte (`pdf`, `pdf_sha256`); única por eleição, cargo e UF |
| `core.government_plan_pages` | Texto de cada página como extraído do PDF                                 | `search` em português (índice GIN) para a busca por palavra                  |
| `core.plan_themes`           | Temas fixos com palavras e áreas de obra correspondentes                  | Curadoria do Cobra, sem IA; mudar é migração nova                            |
| `core.plan_page_themes`      | Temas de cada página, com a contagem de palavras                          | Tema atribuído com 2 ocorrências ou mais                                     |

### Trajetória, patrimônio e receitas (changes `ingestao-tse-candidaturas`, `ingestao-tse-patrimonio` e `ingestao-tse-doadores`)

| Tabela                   | O que guarda                                                                                                    | Regras                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core.candidacies`       | Candidaturas em eleições ordinárias desde 1994 de políticos do cadastro, uma linha por turno, com votos somados | Ligadas pelo CPF ou por nome civil e nascimento (`match_rule`); sem CPF, e-mail, título, gênero, cor ou raça; `source_id` = `<SQ_CANDIDATO>-<turno>`     |
| `core.declared_assets`   | Bens declarados ao TSE pelas candidaturas do cadastro (desde 2006): tipo, categoria e valor                     | Sem a descrição do bem (traz endereço); categoria por código do tipo (imóveis, veículos, dinheiro, outros); `source_id` = `<ano>-<SQ_CANDIDATO>-<ordem>` |
| `core.campaign_receipts` | Receitas de campanha das candidaturas do cadastro (desde 2018), somadas por origem e fonte                      | Pessoas físicas só como quantidade e total; nome só de partido doador; nenhum CPF, CNPJ ou endereço                                                      |

### Votações (changes `ingestao-camara-votacoes` e `ingestao-senado-votacoes`)

| Tabela                        | O que guarda                                                                                                   | Regras                                                                                                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core.votes`                  | Votações do Plenário da Câmara e do Senado: data, descrição, resultado, contagem oficial, proposição principal | `nominal = false` para simbólica; `secret = true` para secreta do Senado (só totais); nenhuma das duas tem voto individual; `quality_notes` quando os votos não conferem                                                           |
| `core.vote_ballots`           | Voto de cada parlamentar em votação nominal, com partido e UF na data                                          | Inclui quem não está no cadastro (`politician_id` nulo), para o placar; opção `sim`, `nao`, `abstencao`, `obstrucao`, `art17`, `presidente`, `presente_sem_voto`, `ausente` (motivo do Senado em `option_detail`), `nao_informado` |
| `core.vote_orientations`      | Orientação de cada liderança ou bancada                                                                        | Como a casa escreve o nome da bancada                                                                                                                                                                                              |
| `core.vote_curation`          | Inclusão manual de votação no feed, com justificativa publicada (painel editorial)                             | Justificativa de ao menos 20 caracteres, quem e quando                                                                                                                                                                             |
| `core.vote_relevance` (visão) | Critérios atendidos por votação nominal: `divergencia`, `placar_disputado`, `tipo_de_materia`, `curadoria`     | DDR §9.2; "liberado" não é posição; simbólica e secreta ficam fora                                                                                                                                                                 |
| `core.events` (visão)         | O que o feed lê: `votacao_relevante` e `votacao_simbolica` (evento da proposição, sem voto individual)         | Calculada das tabelas, sem cópia                                                                                                                                                                                                   |

### Despesas da cota (change `ingestao-despesas`)

| Tabela          | O que guarda                                                  | Regras                                                                                                                           |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `core.expenses` | Despesas da cota parlamentar da Câmara e do Senado desde 2023 | Fornecedor pessoa física sem nome nem CPF; passageiro e trecho nunca lidos; valor líquido como a casa informa (estorno negativo) |

### Presença (change `ingestao-presenca`)

| Tabela                    | O que guarda                                                      | Regras                                                                                        |
| ------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `core.sessions`           | Sessões deliberativas encerradas do Plenário da Câmara desde 2023 | Solenes, canceladas e comissões ficam fora                                                    |
| `core.session_attendance` | Deputados com presença registrada em cada sessão                  | Ligados ao cadastro pelo id da Câmara; no Senado, o comparecimento vem de `core.vote_ballots` |

### Painel editorial (change `painel-editorial`)

| Tabela                             | O que guarda                                                     | Regras                                                    |
| ---------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| `editorial.editors`                | E-mails que podem usar o painel                                  | Além do segundo fator; o site não lê o schema `editorial` |
| `editorial.vote_summaries`         | Versões dos resumos de votação: rascunho, publicado, substituído | Uma publicada por votação; aprovação com quem e quando    |
| `editorial.log`                    | Trilha de auditoria: rascunho, aprovação, curadoria, retirada    | Só inserção para `cobra_editor`                           |
| `core.published_summaries` (visão) | Resumos aprovados, o que o site lê                               | Ver docs/painel-editorial.md                              |

### Alertas (change `alertas-cadastro`)

| Tabela                 | O que guarda                                                                                                             | Regras                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `alerts.subscriptions` | Uma inscrição por e-mail: e-mail e preferências (estado, seguidos) cifrados, situação e consentimentos com versão e data | E-mail localizado por HMAC (`email_lookup`), nunca em texto; o site público e o painel não leem o schema `alerts` |
| `alerts.links`         | Links enviados por e-mail (confirmar, meus dados)                                                                        | Só o SHA-256 do token; confirmar vale uma vez                                                                     |
| `alerts.access_log`    | Cada ação sobre uma inscrição, sem o e-mail                                                                              | Só inserção para `cobra_alerts`; sobrevive à exclusão                                                             |
| `alerts.deliveries`    | Resumos semanais enviados ou que falharam, por inscrição e semana, com as votações incluídas                             | Um por semana; apagado com a inscrição                                                                            |
|                        | Mensagens gravadas em vez de enviadas, sem `RESEND_API_KEY` fora de produção                                             | Desenvolvimento e testes                                                                                          |

Ver docs/alertas.md.

### Reportes (change `reporte-de-erro`)

| Tabela                        | O que guarda                                                                                                    | Regras                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `reports.reports`             | Reporte de erro ou contestação: página, tipo, descrição, e-mail cifrado opcional, situação, nota pública, prazo | O id é o protocolo; descrição e e-mail nunca são públicos; e-mail apagado 90 dias depois do fechamento |
| `reports.history`             | Cada passo da triagem: editor, situação, nota, se houve resposta                                                | Só inserção para `cobra_editor`                                                                        |
| `core.public_reports` (visão) | Fila pública: protocolo, página, tipo, situação, nota, datas                                                    | O que o site lê                                                                                        |

Ver docs/correcoes.md.

## Papéis e usuários

As migrações criam os papéis `cobra_web_reader` e `cobra_collector` sem login e sem senha, e dão a eles os privilégios, inclusive para tabelas futuras (`alter default privileges`).

Usuários com login são criados por ambiente, fora do repositório, com a senha guardada no gerenciador de segredos da hospedagem:

```sql
create role cobra_web login password '<senha gerada>';
grant cobra_web_reader to cobra_web;

create role cobra_etl login password '<senha gerada>';
grant cobra_collector to cobra_etl;

create role cobra_alertas login password '<senha gerada>';
grant cobra_alerts to cobra_alertas;

create role cobra_reportes login password '<senha gerada>';
grant cobra_reports to cobra_reportes;
```

A `DATABASE_URL` de cada ambiente usa o usuário correspondente. No Supabase local, os coletores usam o superusuário `postgres`.

## Migrações e testes

- `pnpm db:reset` recria o banco local aplicando todas as migrações.
- `pnpm check:db` cria um banco descartável (`cobra_test_<aleatório>`), aplica as migrações, roda os testes de `collectors/tests/db/` e apaga o banco. O banco de desenvolvimento não é alterado.
- No CI, os mesmos testes rodam contra um Postgres 17 puro. O teste do papel `anon` (exclusivo do Supabase) é pulado lá.
