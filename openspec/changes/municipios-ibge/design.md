# Design

## Context

- `core.localities` já aceita municípios (código de 7 dígitos, `uf_code` = dois primeiros dígitos, verificado por restrição).
- Brasília já existe, criada pela migração das obras.
- API do IBGE conferida em 2026-10-26: `GET /api/v1/localidades/municipios?view=nivelado` devolve 5.571 itens com `municipio-id`, `municipio-nome`, `UF-id` e `UF-sigla`, num único JSON (2,4 MB), sem chave.
- A lista de senadores traz `http://www.senado.leg.br/senadores/img/fotos-oficiais/senador<código>.jpg`. Esse endereço redireciona (301) para `https://legis.senado.leg.br/senadores/fotos-oficiais/<código>` (JPEG, conferido).

## Goals / Non-Goals

**Goals:** todos os municípios com nome de busca; foto dos senadores em `https`.

**Non-Goals:** CEP → município fora do DF; distritos e bairros.

## Decisions

### D1. Adaptador `ibge`
- Tarefa única `municipalities` (dedupe `run`). Uma requisição, com o bruto guardado.
- Upsert por código IBGE: fonte `ibge`, `source_id` = código, `source_url` = endereço da API.
- Brasília, que já existe, só ganha `search_name`.
- Validação: pelo menos 5.000 municípios e todo código com 7 dígitos e UF existente. Fora disso, a tarefa falha sem gravar nada.
- Limite: 1 req/s.

### D2. `search_name`
- Coluna `text`, com índice comum, preenchida pelo coletor com o nome sem acentos, em minúsculas e com espaços simples. É a mesma normalização de `normalize_name`, mas em minúsculas.
- UFs também ganham `search_name` na migração (ex.: `distrito federal`), para a busca por nome de UF.

### D3. Foto do senador
`normalize_senator` monta o endereço a partir do código, em vez de usar o da lista. Os registros já guardados são corrigidos na próxima coleta.

### D4. Testes
- Sem banco: normalização do nome e montagem do endereço da foto.
- Com banco, com amostra reduzida da resposta real (municípios do DF, de SP e de alguns outros):
  - carga e segunda carga igual;
  - busca sem acento;
  - Brasília preservada;
  - resposta com poucos municípios falha sem gravar.

## Risks / Trade-offs

- [Município novo criado por lei] → A carga é idempotente e roda de novo sem problema.
- [Nome com apóstrofo ou hífen (ex.: "Alta Floresta D'Oeste")] → A normalização mantém letras e o apóstrofo; a busca compara o nome inteiro ou o começo dele.

## Migration Plan

Migração com a coluna e o índice. Primeira carga: `enqueue ibge`.
