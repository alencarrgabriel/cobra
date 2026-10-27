# Relevância e eventos

## Why

O feed "O que aconteceu" (RF-10, change 24) mostra só votações relevantes, por um critério objetivo, auditável e exibido na página (DDR §9.2). As votações das duas casas já estão no Cobra; falta marcar quais são relevantes e por quê, e montar a lista de eventos que o feed vai ler.

Ao calcular o critério "tipo de matéria", apareceu um defeito da change `ingestao-camara-votacoes`: nenhuma votação nominal da Câmara tinha proposição, porque metade não informa a proposição principal e a outra metade aponta um requerimento. Esta change corrige a escolha.

## What Changes

- **Critérios (DDR §9.2)**, calculados no banco para cada votação nominal:
  - `divergencia`: Governo e Oposição orientaram posições diferentes (sim, não ou obstrução; "liberado" não conta como posição);
  - `placar_disputado`: diferença entre "sim" e "não" menor que 20% dos votantes;
  - `tipo_de_materia`: PEC, medida provisória (MPV), projeto de lei complementar (PLP), lei orçamentária (PLN) ou veto (VET);
  - `curadoria`: inclusão manual com justificativa publicada, registrada pelo painel editorial (change 23); a tabela já existe e começa vazia.
- **Eventos**: lista única que o feed lê, com a data, a casa e o tipo: `votacao_relevante` (nominal com ao menos um critério) e `votacao_simbolica` (simbólica com proposição, como evento da proposição, sem voto individual).
- **Perfil**: no "Como votou", a votação relevante ganha a indicação "Votação relevante" com o critério em palavras.
- **Correção**: a proposição de cada votação da Câmara passa a ser a que o arquivo indica, se listada e não for requerimento; senão a matéria listada; senão a primeira.

## Fora de escopo

- Feed e página da votação (change 24); registro da curadoria pelo painel (change 23); limite de curadorias.
- Eventos de projeto apresentado (RF-12) e de faltas e gastos (RF-16): dependem de coletas futuras.

## Capabilities

### New Capabilities
- `relevancia`: critérios objetivos de votação relevante e a lista de eventos.

### Modified Capabilities
- `votacoes`: a proposição da votação da Câmara é escolhida pela matéria quando o arquivo aponta um requerimento ou nada.

## Impact

- Migração: visões `core.vote_relevance` e `core.events`, tabela `core.vote_curation`.
- `collectors`: escolha da proposição (`camara_votacoes_model.main_proposition`) e testes; recoleta 2023 a 2026.
- `web`: indicação no perfil; seed e testes.
