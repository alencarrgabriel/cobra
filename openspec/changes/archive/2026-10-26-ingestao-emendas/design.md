# Design

## Context

- Obras do DF (`core.works`, 1.147) e 594 congressistas (Câmara e Senado) já estão no banco. Os adaptadores seguem o fluxo da `infra-coleta`.
- Portal da Transparência, conferido em 2026-10-26:
  - `https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO` redireciona para `https://dadosabertos-download.cgu.gov.br/PortalDaTransparencia/saida/emendas-parlamentares/EmendasParlamentares.zip`;
  - o arquivo tem 32 MB e é público, sem chave (atualizado em 27/10/2026, 01:44);
  - dentro dele: `EmendasParlamentares.csv` (47 MB, 94.747 linhas), `_Convenios.csv` e `_PorFavorecido.csv`;
  - CSV em Latin-1, separado por `;`, valores no formato `250000,00`;
  - colunas usadas: código, ano, tipo, código e nome do autor, número, localidade, município e UF IBGE, função, subfunção, programa, ação, valores empenhado, liquidado e pago, restos a pagar;
  - o código da emenda tem 12 dígitos: ano (4), autor (4) e número (4), por exemplo `202542680008`;
  - 1.278 linhas com destino ao DF ("DISTRITO FEDERAL (UF)" ou "BRASÍLIA - DF"); linhas antigas (2014) vêm com código "Sem informação".
- Obrasgov `/empenho?id_projeto_investimento=` (OpenAPI em `/openapi.json`):
  - campos: `nr_empenho`, `data_emissao`, `valor_empenho`, `resultado_primario`, `codigo_autor_emenda`;
  - amostra de 60 obras do DF: 173 empenhos, 11 obras com o campo da emenda preenchido;
  - valores do campo: `"0"` (sem emenda), lixo (`"1aaelz"`), código completo como número decimal com dígito perdido (`"20264268000.0"`) e autor mais número sem o ano (`"71080013"`).

## Goals / Non-Goals

**Goals:** emendas do DF com autor ligado ao político, empenhos das obras e vínculo "direto" confiável.

**Non-Goals:** vínculo por convênio, emendas Pix, emendas fora do DF, telas.

## Decisions

### D1. Fonte `transparencia` e tarefa
- `alter type core.data_source add value 'transparencia'`.
- Adaptador `transparencia`, tarefa única `amendments` (dedupe `run`):
  - baixa o ZIP pelo endereço final, guardado inteiro como bruto em disco pelo `RawStore`;
  - lê o CSV principal, filtra o DF e publica numa transação.
- Limite: 1 req/s. É um único arquivo por carga.

### D2. Tabelas
- `core.amendment_authors`:
  - `source_id` = código do autor;
  - `name`;
  - `kind`: `individual`, `bancada`, `comissao` ou `relator`, pelo "Tipo de Emenda";
  - `politician_id` opcional.
- `core.amendments`:
  - `source_id` = código da emenda;
  - `year`, `number`, `type`, `author_id`;
  - `locality` (texto da fonte), `uf_code`, `municipality_code`;
  - `functions` (lista de nomes de função), `main_function` (função da linha de maior valor empenhado);
  - `committed`, `liquidated`, `paid`, `rp_paid` (somados das linhas).
- `core.work_commitments`:
  - `work_id`, `source_id` = número do empenho;
  - `issued_on`, `value`, `primary_result`;
  - `amendment_ref_raw` (como veio) e `amendment_code` (reconhecido, D4).
- `core.work_amendment_links` é uma visão: junta `work_commitments.amendment_code` com `amendments.source_id`, com grau `direto` e o autor e o político da emenda. É uma visão, não uma tabela, porque as duas fontes chegam em ordens diferentes e o vínculo nunca fica desatualizado.

### D3. Autor → político
- Nome do autor normalizado (sem acentos, maiúsculas, espaços simples) comparado ao `parliamentary_name` normalizado dos políticos com mandato de deputado federal ou senador, em qualquer situação.
- Exatamente um: liga. Zero ou mais de um: sem político, com o log registrando o nome.
- Autores de bancada, comissão e relator nunca são ligados a político.

### D4. Reconhecer a emenda no empenho
- Remove espaços e o sufixo `.0`. Só dígitos seguem.
- 12 dígitos: é o código.
- 8 dígitos: autor e número; o ano vem de `data_emissao` (ou dos 4 primeiros caracteres de `nr_empenho`).
- Qualquer outro tamanho, `"0"`, vazio ou com letras: sem código. O valor bruto fica guardado para auditoria.

### D5. Empenhos no Obrasgov
- Nova tarefa `commitments` (dedupe = obra), enfileirada pela publicação da obra como as de detalhe. Busca todas as páginas de `/empenho` da obra.
- Upsert por número de empenho e obra.

### D6. Emendas por área
- Consulta sobre `core.amendments`, agrupada por `uf_code` e `main_function`, com contagem e somas.
- Fica como função SQL simples para as telas: `core.amendments_by_function(uf text)`.

### D7. Testes
- Amostras reais reduzidas:
  - o CSV com 30 linhas: do DF, de outro estado e sem código, de vários tipos de autor;
  - um ZIP montado no teste a partir desse CSV;
  - respostas `/empenho` de duas obras, uma com identificadores reconhecíveis.
- Sem banco: leitura do CSV, soma por código, tipo de autor, reconhecimento do identificador.
- Com banco:
  - carga e segunda carga igual;
  - autor ligado e bancada sem político;
  - vínculo direto pelo código completo e pelo autor com número;
  - identificador sem correspondência;
  - emendas por função.

## Risks / Trade-offs

- [Nome do autor diferente do nome parlamentar] → Sem ligação quando não casa. A tela mostra o autor pelo nome da fonte, e o vínculo melhora com o TSE.
- [Poucos empenhos trazem a emenda] → Na amostra, 11 de 60 obras. É o vínculo mais confiável que existe, e o grau "direto" deixa isso claro.
- [Arquivo de 47 MB lido em memória] → Leitura linha a linha e filtro do DF antes de guardar. O bruto inteiro fica em disco.

## Migration Plan

Migração nova com o valor de fonte, as três tabelas, a visão e a função. Primeira carga pela CLI: `enqueue transparencia` e `enqueue obrasgov` (com os empenhos).
