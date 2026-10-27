# Plano de governo

## Why

A change `ingestao-planos-de-governo` guardou no banco os planos registrados no TSE pelas chapas eleitas em 2022 para presidente e governador do DF, com o PDF oficial, o texto de cada página e os temas por palavras fixas. Falta a tela: o DDR 3.0 põe "o que quem governa prometeu" no centro do produto, ao lado das obras da mesma área (cap. 1, §4.4c).

Requisitos cobertos: RF-80 (plano organizado por tema, trechos literais e link para a página exata do PDF oficial), RF-81 (busca por palavra) e RF-82 (obras com recurso federal da mesma área na localidade, sem afirmar se a promessa foi cumprida).

## What Changes

- Página `/planos` com os planos guardados (presidente e governador do DF, eleição de 2022): cargo, chapa, partido, número de páginas e fonte.
- Página permanente de cada plano, `/planos/<eleição>-<cargo>[-<uf>]` (ex.: `/planos/2022-governador-df`):
  - cabeçalho com cargo, eleição, chapa e partido como registrados no TSE, link para o PDF oficial, fonte, data de coleta e hash do arquivo;
  - temas em ordem alfabética, cada um com o número de páginas em que aparece; ao escolher um tema, os **trechos literais** das páginas com as palavras do tema destacadas e o link para a página exata do PDF;
  - ao lado do tema, as **obras com recurso federal da mesma área no DF**, em ordem alfabética, com a situação, e a frase de que o Cobra não afirma se a promessa foi cumprida;
  - **busca por palavra** no plano, com os trechos e as páginas;
  - as palavras usadas para marcar cada tema, para quem quiser conferir (sem IA).
- Rota que serve o PDF oficial guardado, sem alteração, para abrir na página do trecho (`#page=N`).
- "Planos" entra na navegação.
- Endereço inexistente responde 404 pelo Proxy, como nas outras páginas com código.

## Fora de escopo

- Plano dos prefeitos (RF-83, fase 2) e comparador de candidatos (RF-84, fase 3, após parecer).
- Card de compartilhar do plano (RF-61 não lista plano); a página tem prévia de link simples.
- Ligação do plano ao perfil do político: presidente e governador não estão no cadastro de parlamentares.

## Capabilities

### New Capabilities
- `tela-de-planos-de-governo`: o que as páginas de plano mostram e como.

### Modified Capabilities
- `identidade-visual`: a navegação passa a ter cinco seções, com Planos.

## Impact

- `web/src/app/planos/**`, `web/src/lib/plans/**`, `web/src/proxy.ts`, `web/src/components/AppShell/{sections.ts,Nav.tsx}`.
- Seed de testes com um plano fictício (PDF gerado no teste).
- Sem mudança no banco nem nos coletores.
