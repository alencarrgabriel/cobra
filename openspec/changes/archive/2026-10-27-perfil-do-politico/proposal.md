# Proposal

## Why

Na grade "Seus representantes", o painel de cada card precisa levar ao perfil (RF-09), e o foco do DDR 3.0 é ligar o político ao dinheiro que chega à cidade: as emendas que indicou e as obras que elas pagaram (RF-28, RF-34). O perfil é "enxuto": mostra o que o Cobra já tem com fonte oficial e, para o que ainda não foi coletado, diz isso claramente em vez de mostrar zero.

## What Changes

- Página permanente `/politicos/<id>-<nome>` para cada político do cadastro (deputados federais, senadores e distritais), com:
  - **cabeçalho**: foto oficial, nome, bandeira da UF, selo do partido, cargo e situação;
  - **"Quem é"** (RF-35): frase de modelo fixo, sem IA, só com dados oficiais. Exemplo: "Damares Alves tem mandato no Senado Federal pelo Distrito Federal, pelo Republicanos, desde 01/02/2023." A forma não depende de gênero, que o Cobra não guarda;
  - **mandatos e partidos** (RF-27): mandatos guardados e histórico de filiações com datas, quando a fonte informa;
  - **emendas** (RF-28): emendas de autoria do político com destino ao DF, com ano, área, valores empenhado, liquidado e pago, e a soma; o recorte é dito na tela;
  - **obras pagas por essas emendas** (RF-34): obras do DF ligadas às emendas, com a situação e o grau de confiança do vínculo ("direto");
  - **o que ainda não está no Cobra**: votos, projetos, presença, gastos da cota, patrimônio e trajetória eleitoral aparecem como "—" com o motivo (regra do DDR §9.1) e a change que vai trazê-los;
  - **perguntas frequentes factuais e políticos relacionados** (RF-38): mesma UF e mesmo partido, em ordem alfabética, com dados estruturados (schema.org) para buscadores;
  - fonte e data de coleta de cada bloco.
- O painel da grade de representantes ganha o link "Ver perfil completo".
- Código ou nome inexistente responde 404 (pelo Proxy, como nas obras).

Requisitos do DDR cobertos: RF-09 (link para o perfil), RF-20 (dados cadastrais), RF-27, RF-28 (recorte DF), RF-33 em parte (seções, resumo sem ranking), RF-34, RF-35 (sem eleições e votos, que dependem do TSE), RF-38, RF-60, §9.1 (regra do "—").

Fora de escopo:
- "É você nesta página?" (RF-59): depende do canal de contestação (`metodologia-e-reporte-de-erro`) e de um contato público, que precisa de decisão do responsável.
- Votos, projetos, presença, gastos, patrimônio e trajetória (changes `ingestao-camara-votacoes`, `ingestao-senado-votacoes`, `ingestao-despesas-presenca`, `ingestao-tse`).
- Comparador (RF-29, fase 2).
- Compartilhar (`compartilhamento`).

## Capabilities

### New Capabilities

- `perfil-do-politico`: o que a página de cada político mostra, de onde vem cada bloco e como o site trata o que ainda não foi coletado.

### Modified Capabilities

- `busca-de-representantes`: o resumo do card leva ao perfil completo.

## Impact

- `web/src/lib/politicians/` (consultas e frase "Quem é").
- `web/src/app/politicos/[slug]/`.
- `RepresentativesGrid`: link para o perfil.
- `proxy.ts`: checagem de político.
- Seed de teste com emendas e vínculos fictícios.
