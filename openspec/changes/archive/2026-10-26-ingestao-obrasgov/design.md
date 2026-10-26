# Design

## Context

A `infra-coleta` entregou fila, limitador, retentativas, camada bruta e o fluxo "buscar → bruto → validar → publicar". O banco tem `core.localities` só com as 27 UFs. Motivação: ver proposal.md.

**API verificada em 2026-10-26** (OpenAPI em `https://api-publica.obrasgov.gestao.gov.br/obras/openapi.json`; dicionário de dados no "Modelo de Dados" linkado na própria documentação):
- `/projeto-investimento?uf_principal=DF&pagina=N&tamanho_da_pagina=200` → `{data, total_pages, total_items, page_number, page_size}`. DF: 1.147 obras (6 páginas).
- `/execucao-fisica?id_projeto_investimento=X` e `/historico-situacao-cancelada-paralisada?id_projeto_investimento=X`: sem filtro por UF, só por obra.
- `/geometria?sg_uf=DF` → município (`cod_ibge`) por obra. DF: 1.287 registros.
- `/data-atualizacao` → `{"data_ultima_atualizacao": "2026-10-23T00:00:00"}`.
- Situações: Cadastrada, Em execução, Concluída, Paralisada, Inacabada, Cancelada.
- Sem chave e sem cabeçalhos de limite (resposta via Azure Front Door). Fotos: só a indicação `ind_foto: "SIM"`, sem URL.
- Qualidade observada: obras com prazo vencido há anos ainda "Cadastrada"; o histórico de uma obra veio com 129 eventos idênticos e ids diferentes.

## Goals / Non-Goals

**Goals:** todas as obras do DF, com andamento e histórico de paralisação, atualizáveis diariamente.

**Non-Goals:** outras UFs (fase 2; o adaptador já recebe a UF como parâmetro), empenhos e contratos (`ingestao-emendas`), telas, agendamento automático.

## Decisions

### D1. Modelo
```
core.work_status (enum)  registered | in_progress | completed | stopped | unfinished | cancelled
core.works               id, name, description, social_function, address, postal_code,
                         nature, species, axis, type, subtype, status, uf_code → localities,
                         responsible_org, transferors jsonb, recipients jsonb, executors jsonb,
                         planned_value numeric(16,2), planned_start, planned_end,
                         actual_start, actual_end, latitude, longitude, has_photos,
                         physical_progress numeric(5,2), progress_updated_on, registered_on,
                         + rastreabilidade, unique(source, source_id)
core.work_progress       id, work_id, percent, started_on, ended_on, updated_on, + rastreabilidade
core.work_status_events  id, work_id, status, occurred_on, justification, in_negotiation,
                         negotiation_phase, + rastreabilidade, unique(work_id, status, occurred_on, justification)
core.work_localities     work_id, locality_code → localities, + rastreabilidade, pk(work_id, locality_code)
```
- Repassador, tomador e executor ficam em `jsonb` (lista de `{name, cnpj}`): são só exibidos, sem consulta própria no MVP. Quando as emendas precisarem cruzar órgãos, viram tabelas.
- `planned_value` é a soma de `investimentos_previstos` (a fonte informa o valor por fonte de recurso; no DF todas são "Federal").
- `physical_progress` e `progress_updated_on` repetem o registro de execução mais recente, para a lista de obras não precisar de agregação.
- `latitude` e `longitude` vêm do primeiro pino, lidas do texto WKT (`POINT (lon lat)`): os campos `latitude`/`longitude` da própria API às vezes vêm cortados quando falta o espaço depois de `POINT` (ex.: longitude `"15.8002630106667)"`, observado em 2026-10-26). Pontos fora de uma caixa ampla do território brasileiro são descartados. Sem pino válido, ficam nulas.
- `source_url` aponta para a consulta da obra na API (`/projeto-investimento?id_projeto_investimento=X`), que qualquer pessoa pode abrir.
- Município de Brasília (5300108) entra na migração. Geometria de município ainda não cadastrado é ignorada com registro no log, sem falhar a tarefa.

### D2. Tarefas
| Tipo | Chave | Conteúdo |
|---|---|---|
| `projects` | `DF-p<N>` | Uma página de 200 obras. Publica as obras e enfileira um `detail` por obra (na mesma transação, então só se a página for publicada) |
| `detail` | `<id>` | Execução física e histórico de uma obra (2 requisições) |
| `geometry` | `DF-p<N>` | Uma página de geometrias do DF |

`plan()` enfileira a página 1 de `projects` e de `geometry`. Cada página, ao ser processada, enfileira a seguinte se `page_number < total_pages`. Assim o total de páginas vem da própria fonte.

Volume diário no DF: cerca de 7 + 7 + 2 × 1.147 ≈ 2.300 requisições; a 2 req/s, cerca de 20 minutos. Para todo o Brasil (fase 2), a execução física e o histórico passam a ser lidos por varredura completa paginada (cerca de 420 páginas), e não por obra.

### D3. Ordem entre tarefas
Execução, histórico e geometria referenciam a obra. Como as tarefas `detail` só são criadas depois que a página da obra é publicada, a obra sempre existe. Na `geometry`, uma obra ainda não coletada é ignorada com registro no log, e a próxima coleta completa a ligação.

### D4. Validação: estrutura bloqueia, qualidade vira nota
A primeira carga real (2026-10-26) mostrou obras com término previsto anterior ao início, como a fonte informa (`4644.53-15`, `4652.53-69`). Com a regra original, isso barrava a página inteira e, como a próxima página só era enfileirada depois da publicação, as páginas seguintes nunca eram coletadas (400 de 1.147 obras). Regra revista:
- **Estrutura (bloqueia a página):** id no formato `^\d+\.\d{2}-\d{2}$`, situação na lista conhecida, UF principal igual à pedida, nome presente, valores ≥ 0, percentual entre 0 e 100.
- **Qualidade (publica com nota):** término previsto antes do início previsto. A obra é publicada com as datas da fonte e `quality_notes` recebe a descrição. O banco não tem mais a restrição de datas em `core.works`.
- **Paginação independente:** a próxima página é enfileirada por `ctx.enqueue(..., independent=True)`, que grava fora da transação da tarefa. Uma página reprovada não impede as seguintes.
- Uma página reprovada por estrutura volta para a fila e, se persistir, fica como falha definitiva visível em `cobra-collect status`.

### D5. Limite de taxa
2 req/s com rajada de 2: a fonte não documenta limite e responde por Azure Front Door; o valor é conservador.

## Risks / Trade-offs

- [Fonte muda formato ou situações] → Validação reprova e a tarefa falha com registro; o bruto guardado permite reprocessar.
- [Situação desatualizada pelos gestores] → Cada obra mostra "informado pelo gestor" e a data da base (DDR RF-44); não corrigimos o dado da fonte.
- [Eventos duplicados na fonte] → Deduplicação por (situação, data, justificativa) na própria tabela.

## Migration Plan

Migração aditiva. Primeira carga: `cobra-collect enqueue obrasgov` e `cobra-collect work --source obrasgov` (cerca de 20 minutos).

## Resultado da primeira carga real (2026-10-26, banco local)

| Item | Valor |
|---|---|
| Obras do DF | 1.147 (igual ao total da API) |
| Situação | 628 cadastradas, 182 em execução, 302 concluídas, 6 paralisadas, 3 inacabadas, 26 canceladas |
| Valor previsto somado | R$ 78,9 bilhões |
| Com coordenadas válidas | 1.136 |
| Com execução física | 521 |
| Eventos de paralisação/cancelamento (distintos) | 6 |
| Com nota de qualidade (término antes do início) | 5 |
| Ligadas a município pela geometria | 638 (a fonte só tem geometria para parte das obras) |
| Tarefas | 1.160 concluídas; 1 HTTP 500 temporário da fonte, resolvido na segunda tentativa da fila |
| Duração | cerca de 20 minutos a 2 req/s |
