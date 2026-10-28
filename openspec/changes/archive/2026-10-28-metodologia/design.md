# Design

## Context

As regras já existem no código:
- relevância: `core.vote_relevance`, §9.2;
- temas dos planos: `core.plan_themes`, com `MIN_HITS = 2` no coletor;
- graus do vínculo obra–emenda: `core.work_amendment_links`;
- fontes: `docs/coleta.md`.

A página repete essas regras para o público. Os números e as listas que mudam com os dados (datas de coleta, palavras dos temas) são lidos do banco, para não ficarem desatualizados.

## Decisions

### D1. Conteúdo
- **Texto fixo**: na página, em pt-BR simples. Cada critério usa o mesmo número do SQL: diferença menor que 20% dos votantes; PEC, MPV, PLP, PLN e VET; divergência só entre "sim", "não" e "obstrução".
- **Fontes, em ordem alfabética**:
  - Câmara dos Deputados;
  - CLDF;
  - IBGE;
  - Obrasgov.br;
  - Portal da Transparência;
  - Senado Federal;
  - TSE.
- Cada fonte traz o link oficial, o que o Cobra usa dela e a última coleta.
- **Atualização**: as metas do DDR (RNF-05 a RNF-07) aparecem como metas. A página diz que a data de cada dado é a que vale, porque o agendamento ainda está sendo montado.

### D2. Dados lidos do banco
- **Última coleta por fonte**: o maior `collected_at` entre as tabelas principais, agrupado por `source`. Entram políticos, votações, despesas, sessões, obras, emendas, candidaturas, planos e localidades.
- **Temas**: `label` e `keywords` de `core.plan_themes`, em ordem alfabética do rótulo.
- **Cache**: `'use cache'` com `cacheLife("hours")`. Sem banco, a seção mostra "—" com a explicação, e o resto da página continua.
- **Leitura por pedido**: a página chama `connection()` antes da consulta em cache. Sem isso, ela era pré-gerada no build, e o prefetch dos links para `/metodologia` ficava pendurado por cerca de 30 s.

### D3. Links
- **Rodapé**: "Metodologia".
- **"Por que é relevante?"**: no feed e na página da votação, leva a `/metodologia#relevancia`.
- **Planos**: a nota de temas leva a `/metodologia#temas`.

### D4. Testes
- Playwright:
  - as seções e as âncoras;
  - o critério de 20%;
  - os temas do seed com as palavras;
  - a última coleta de uma fonte do seed;
  - o link do rodapé;
  - axe.
