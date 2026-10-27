# Mapa do Brasil

## Why

A jornada "Explorar pelo mapa" do DDR começa na página inicial: a pessoa toca num estado e vê a bancada daquele estado e o placar das votações recentes (RF-31). A página inicial também deve mostrar exemplos de cards antes de pedir o CEP (RF-69), para quem chega sem saber o que o Cobra faz. Hoje a página inicial só tem a busca.

Requisitos cobertos: RF-31 e RF-69. O placar por estado depende das votações, que ainda não foram coletadas (changes 19 e 20): nesta change ele aparece como "—" com o motivo, pela regra do DDR §9.1.

## What Changes

- **Mapa do Brasil** na página inicial, desenhado a partir da malha oficial do IBGE (27 UFs), gerado uma vez por script e versionado; o site não consulta o IBGE em tempo real.
  - Todos os estados com a mesma cor (nada de colorir por partido ou por número); destaque só no estado sob o dedo ou o foco.
  - Cada estado é um link para a bancada daquele estado (`/representantes/<código IBGE da UF>`), que já mostra a grade de fotos, o filtro por partido e o painel de compartilhar.
  - Lista dos 27 estados com a bandeira, em ordem alfabética, ao lado do mapa: o DF é pequeno demais para tocar no mapa, e a lista serve a leitores de tela.
  - Fonte e data da malha na tela.
- **Placar das votações recentes** na página de representantes de um lugar: bloco com "—" e "Ainda não está no Cobra: vem com a coleta das votações da Câmara e do Senado".
- **Exemplos de cards** na página inicial (RF-69): o card dos representantes do DF e o card da obra do DF com a atualização mais recente no Obrasgov.br, com a regra de escolha escrita na tela. Nenhum político é escolhido para exemplo.

## Fora de escopo

- Placar real por estado (vem com as changes de votações).
- Navegação Brasil › UF › município no mapa (§13.1): o município é alcançado pela busca.
- Mapa colorido por qualquer dado.

## Capabilities

### New Capabilities
- `mapa-do-brasil`: o mapa da página inicial e os exemplos de cards.

### Modified Capabilities
- `busca-de-representantes`: a página de um lugar ganha o bloco do placar das votações recentes.

## Impact

- `web/scripts/build-br-map.mjs`, `web/src/lib/geo/br-map.json`, `web/src/components/BrazilMap/**`, `web/src/app/page.tsx`, `web/src/app/representantes/[codigo]/page.tsx`.
- Sem mudança no banco nem nos coletores.
