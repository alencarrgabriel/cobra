# Proposal

## Why

O DDR 3.0 pôs "dinheiro e promessas na sua cidade" no centro do produto, e o piloto é o DF. A primeira peça é saber quais obras com recurso federal existem no DF, quanto custam, em que situação estão, quanto já foi executado e, quando param, por quê. O Obrasgov.br publica isso numa API aberta (verificada em 2026-10-26: 1.147 obras com UF principal DF). Esta change traz esses dados para o banco do Cobra pelo fluxo da `infra-coleta`.

## What Changes

- Valor `obrasgov` na lista de fontes de dados.
- Município de Brasília (código IBGE 5300108) na tabela de localidades: o DF tem um único município, e as obras do piloto apontam para ele. Os demais municípios chegam com `busca-geografica`.
- Tabelas em `core`:
  - `works` (a obra): identificação, endereço, área (eixo, tipo, subtipo), natureza e espécie, situação, órgão responsável, quem repassa, recebe e executa, valor previsto, prazos previstos e efetivos, coordenadas, indicação de foto e o percentual de execução física mais recente;
  - `work_progress` (registros de execução física);
  - `work_status_events` (histórico de paralisação e cancelamento, com a justificativa oficial, sem repetições);
  - `work_localities` (municípios de cada obra, pela geometria).
- Adaptador `obrasgov` para os coletores:
  - páginas de obras do DF e da geometria do DF;
  - para cada obra, uma tarefa de detalhe (execução física e histórico);
  - data da base (`/data-atualizacao`) gravada como data de atualização na fonte;
  - validações antes de publicar.
- Testes com respostas reais gravadas da API (sem rede).

Requisitos do DDR cobertos: RF-40, RF-41, RF-44, RF-39 e RF-48 (dados; as telas vêm em `obras-na-cidade`), RNF-06, RNF-16, §6.1 (Obrasgov).

Fora de escopo: telas; vínculo emenda–obra (RF-42, RF-43, change `ingestao-emendas`); obras fora do DF (fase 2); empenhos e contratos do Obrasgov (entram com as emendas, que precisam deles); agendamento automático (entra com o deploy, quando houver banco de produção).

## Capabilities

### New Capabilities

- `obras-federais`: quais dados de obras com recurso federal o Cobra guarda, de onde vêm, como são atualizados e quais regras de qualidade valem antes de publicar.

### Modified Capabilities

- `rastreabilidade-de-dados`: a lista de fontes conhecidas passa a incluir o Obrasgov.br.

## Impact

- Nova migração em `supabase/migrations/`.
- Novo adaptador `collectors/src/cobra_collectors/sources/obrasgov.py`, registrado no `REGISTRY`.
- Amostras reais da API em `collectors/tests/fixtures/obrasgov/`.
- `docs/modelo-de-dados.md` e `docs/coleta.md` atualizados.
