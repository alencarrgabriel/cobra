# Design

## Context

Banco com políticos, ids externos, mandatos, filiações, partidos com cor, emendas (`core.amendments`, `core.amendment_authors.politician_id`) e vínculos obra–emenda (`core.work_amendment_links`). Site com os padrões das obras (cache, `tryDb`, 404 pelo Proxy) e da grade de representantes.

## Goals / Non-Goals

**Goals:** perfil enxuto e honesto, com o dinheiro e as obras do piloto e a regra do "—".

**Non-Goals:** votos, projetos, presença, gastos, patrimônio, trajetória, contestação e compartilhamento.

## Decisions

### D1. Endereço
- `/politicos/<id>-<slug do nome parlamentar>`. O id é o do Cobra (`core.politicians.id`).
- O Proxy confere se o id existe e redireciona (308) para o slug atual quando o nome no endereço difere. Id inexistente: 404.

### D2. Consultas (`lib/politicians/queries.ts`)
- `getPolitician(id)`:
  - dados cadastrais, partido atual com cor;
  - mandatos (todos, mais recente primeiro) e filiações (mais recente primeiro);
  - ids externos, para os links oficiais.
- `getAmendments(id)`: emendas do autor ligado ao político, ordenadas por ano decrescente e código, com somas.
- `getWorks(id)`: obras pela visão de vínculos, com situação e grau. Ordem pelo nome da obra.
- `getRelated(id, uf, partido)`: até 12 da mesma UF e até 12 do mesmo partido, em ordem alfabética, só com mandato aberto, sem o próprio.
- Tudo com `'use cache'`, `cacheLife('hours')` e o padrão de indisponibilidade.

### D3. Frase "Quem é" (`lib/politicians/who.ts`, pura)
- `<nome> tem mandato na <casa> pel<o/a> <UF por extenso>[, pelo <nome do partido>], desde <data>.`
- O artigo antes da UF vem da tabela de preposições das bandeiras ("do Distrito Federal", "da Bahia", "de São Paulo").
- Suplente em exercício: "... exerce o mandato como suplente na <casa> ...".
- Licenciado: "... tem mandato na <casa> ..., com o exercício hoje suspenso por licença." A forma evita "licenciado" ou "licenciada", que dependeriam do gênero.
- Sem mandato aberto: "<nome> teve mandato na <casa> até <data>."

### D4. Blocos ainda sem dados
Lista fixa no código: votos, projetos, presença, gastos da cota, patrimônio, trajetória. Cada bloco mostra "—", "Ainda não está no Cobra" e o que vai trazê-lo ("vem com a coleta de votações da Câmara e do Senado").

### D5. Perguntas frequentes e dados estruturados
- Perguntas montadas só com o que a página mostra:
  - "Qual é o partido de X?";
  - "Por qual estado X tem mandato?";
  - "Desde quando X está no mandato?";
  - "X indicou emendas para o DF?" (com o número e a soma, ou "o Cobra não tem emendas de X com destino ao DF").
- `<script type="application/ld+json">` com `Person` (nome, cargo, partido como `memberOf`) e `FAQPage`. O JSON é escapado (`<` vira `\u003c`).

### D6. Painel da grade
`RepresentativesGrid` ganha "Ver perfil completo" com o endereço do D1.

### D7. Testes
- Vitest: frase "Quem é" (titular, suplente, sem partido, sem mandato aberto), slug e escape do JSON-LD.
- Playwright, com o seed ampliado (uma emenda de um senador fictício ligada a uma obra do seed):
  - perfil com frase, mandato, partido, emenda com soma e obra com grau "direto";
  - blocos com "—";
  - relacionados em ordem alfabética;
  - slug antigo redireciona;
  - id inexistente dá 404;
  - link no painel da grade;
  - axe nos dois temas.

## Risks / Trade-offs

- [Recorte de emendas parece total] → O título do bloco diz "com destino ao DF" e o texto explica o recorte.
- [Nome muda e quebra links] → O id manda; o slug é só legibilidade, e o Proxy redireciona.

## Migration Plan

Sem migração.
