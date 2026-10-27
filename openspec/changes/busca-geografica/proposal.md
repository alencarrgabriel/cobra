# Proposal

## Why

O centro da jornada do DDR é "informa o CEP → vê seus representantes" (DDR §3, RF-01 a RF-09). O banco já tem os 594 congressistas e os 24 distritais, com partido, cor, bandeira e foto. Falta a busca e a tela "Seus representantes".

## What Changes

- Busca por CEP, cidade ou UF na página inicial e em `/representantes`, sem cadastro (RF-01):
  - **CEP**: vira UF pelas faixas de CEP dos Correios. No DF vira o município de Brasília (5300108), que é o único do DF. Fora do DF, a busca por CEP leva à UF, que já basta para os representantes federais.
  - **Cidade**: nome sem acento comparado com os 5.571 municípios do IBGE; havendo mais de um com o mesmo nome, a pessoa escolhe.
  - **UF**: pela sigla ou pelo nome.
  - O CEP vai no corpo de um envio do formulário (POST), nunca no endereço. Ele é convertido no código IBGE e descartado; não fica no banco nem nos registros (DDR §10, RF-60).
- Página permanente `/representantes/<código IBGE>` (RF-60), com:
  - **Senadores** (3) e **deputados federais** da UF, e a explicação de que são eleitos pelo estado inteiro (RF-03, RF-04);
  - no DF, **deputados distritais**, com a explicação de que fazem o papel de deputado estadual e de vereador (RF-06);
  - fora do DF, um aviso de que deputados estaduais e vereadores ainda não estão no Cobra (RF-05);
  - filtro por partido no endereço (RF-08);
  - grade de cards com foto oficial, nome, bandeira da UF, sigla e cor do partido. Tocar no card abre o painel com o resumo (RF-09). O link para o perfil completo entra com `perfil-do-politico`;
  - fonte e data de atualização de cada casa.
- O site lembra o último lugar no aparelho, só o código IBGE e o nome, sem conta (RF-07).
- Fotos oficiais servidas pelo próprio site (proxy de imagem do Next, só para os endereços oficiais da Câmara, do Senado e da CLDF), sem o navegador do visitante falar com os servidores das casas.
- A seção "Representantes" da navegação deixa de ser "em breve".

Requisitos do DDR cobertos: RF-01 a RF-09, RF-32 (cor, sigla e bandeira), RF-60, RF-69 em parte (a página inicial mostra a busca), RNF-01, RNF-12, RNF-13, RNF-15, §10 (minimização do CEP).

Fora de escopo:
- CEP → município fora do DF: a base de CEP depende de decisão de licença e custo (DDR §15). Fica para a fase 2, com obras de todo o Brasil.
- Perfil completo (`perfil-do-politico`), compartilhamento (`compartilhamento`), mapa do Brasil (`mapa-do-brasil`).

## Capabilities

### New Capabilities

- `busca-de-representantes`: como o cidadão informa onde mora e vê os representantes desse lugar, e o que o site guarda (ou não) dessa busca.

### Modified Capabilities

- `identidade-visual`: a seção "Representantes" passa a ser um link; as fotos oficiais passam pelo próprio site.

## Impact

- `web/src/lib/geo/cep.ts` (faixas por UF), `web/src/lib/places/`, `web/src/lib/representatives/`.
- `web/src/app/buscar/route.ts` (POST), `web/src/app/representantes/` (busca e página por código).
- `next.config.ts`: `images.remotePatterns` dos três endereços oficiais de foto; `Portrait` deixa de usar `unoptimized`.
- Seed do banco de teste com representantes e municípios fictícios.
