# Design

## Context

O mapa atual (`WorksMap`, design D5 de `obras-na-cidade`) é um SVG do contorno do DF, renderizado no servidor. Funciona sem JavaScript, mas não mostra ruas. Lá, a biblioteca de mapas com fundo de ruas foi adiada por peso no celular e pela dependência de um provedor externo. Esta change resolve os dois pontos: o fundo é um arquivo próprio e o código do mapa só carrega depois do conteúdo principal.

Documentação conferida em 2026-10-26: Protomaps (Getting Started, PMTiles com MapLibre, Basemaps com MapLibre, Localization), Google Maps URLs. Versões no npm: `maplibre-gl` 6.16.0 (25/10), `pmtiles` 4.5.0, `@protomaps/basemaps` 5.7.2; CLI `go-pmtiles` 1.31.2.

## Goals / Non-Goals

**Goals:** ruas e bairros no mapa, agrupamento de pinos, resumo ao tocar, nada de terceiros, página útil sem JavaScript.

**Non-Goals:** satélite, outras UFs, mapa na ficha, busca por endereço, atualização automática do fundo.

## Decisions

### D1. Biblioteca e fundo
- MapLibre GL JS 6.x. A versão fixada tem pelo menos duas semanas de publicada (hoje: 6.14.0, de 11/10). Vetorial, de código aberto, desenha no WebGL e aguenta milhares de pinos.
- Fundo: recorte do DF da build diária do Protomaps (`pmtiles extract https://build.protomaps.com/<data>.pmtiles --bbox=-48.35,-16.10,-47.25,-15.45`), zoom 0 a 15. Recorte de 20261026: 49 MB, crédito "© OpenStreetMap".
- Estilo gerado por `@protomaps/basemaps` (`layers('protomaps', namedFlavor('light' | 'dark'), { lang: 'pt' })`). Português tem suporte e usa fontes latinas.
- Fontes (Noto Sans, OFL) e ícones (`sprites/v4/light|dark`) do repositório `protomaps/basemaps-assets`, copiados para `web/public/mapa/` e servidos pelo site.
- Alternativas rejeitadas:
  - Google Maps embutido: manda IP e cookies do visitante ao Google ao abrir a página, exige chave e cobrança.
  - Mapa da Qlik, usado pelo painel do Serpro: chave licenciada ao Serpro.
  - Tiles públicos do OpenStreetMap: a política de uso não permite tráfego de produção de terceiros, e o visitante falaria com outro servidor.

### D2. Arquivo do mapa fora do Git
- `web/scripts/fetch-basemap.mjs` baixa um arquivo fixado em `web/basemap.json` (`{ build, bbox, url, sha256, bytes }`), confere o SHA-256 e grava em `web/public/mapa/df.pmtiles`, que fica no `.gitignore`.
- O recorte é feito uma vez, por quem atualiza o mapa, com o CLI `pmtiles`. Hospedagem definitiva do arquivo a definir com o deploy (armazenamento de objetos ou release do GitHub).
- Enquanto não houver hospedagem, o script grava o arquivo a partir de um caminho local (`BASEMAP_FILE`), conferindo o mesmo hash. Sem o arquivo, o mapa interativo não aparece e o SVG continua.
- O PMTiles é lido com requisições HTTP `Range`. Vamos confirmar que o servidor do Next devolve 206 para arquivos em `public/`; se não, servimos por um Route Handler com suporte a `Range`.

### D3. Carregamento e alternativa sem JavaScript
- O componente `WorksMapInteractive` é client-only e é carregado com `next/dynamic` (`ssr: false`), só em `/obras`. O servidor continua renderizando o SVG atual dentro de um `<noscript>`-equivalente: o SVG é a primeira coisa na tela e é trocado pelo mapa quando este fica pronto.
- O mapa só é criado quando entra na tela (`IntersectionObserver`), para não pesar no LCP (RNF-01).
- Os pinos chegam como GeoJSON já filtrado pelo servidor (as mesmas consultas de `getPins`, mais valor e percentual), como prop serializada. Não há endpoint novo.

### D4. Pinos, grupos e resumo
- Fonte GeoJSON com `cluster: true` (agrupamento nativo do MapLibre), `clusterRadius` em torno de 40 px e `clusterMaxZoom` 14.
- Grupo: círculo neutro com o número; toque aproxima o zoom (`getClusterExpansionZoom`).
- Pino: círculo com a cor da situação (tokens `--work-*` lidos do CSS em tempo de execução, para seguir o tema).
- Resumo: `Popup` do MapLibre com nome, situação, valor previsto e percentual, e link "Ver ficha". Conteúdo montado com nós DOM e `textContent`, nunca `innerHTML`.
- Teclado: o mapa recebe foco e aceita setas e +/−. Como os pinos de WebGL não são focáveis, a lista logo abaixo continua sendo o caminho acessível para cada obra, e o mapa tem um rótulo que diz isso.

### D5. Tema
- Fundo `light` ou `dark` conforme o tema do site. A troca de tema chama `setStyle` com o outro sabor e repõe os pinos.

### D6. CSP
- O MapLibre cria um worker a partir de um blob. Duas opções: a build CSP do MapLibre, com o arquivo do worker servido pelo site (`setWorkerUrl`), ou `worker-src blob:`. Preferimos a build CSP, que não afrouxa a política. `connect-src 'self'` já cobre o PMTiles, as fontes e os ícones.

### D7. Links para o Google Maps
- Formato oficial "Maps URLs", sem chave:
  - ver o ponto: `https://www.google.com/maps/search/?api=1&query=LAT%2CLNG`;
  - como chegar: `https://www.google.com/maps/dir/?api=1&destination=LAT%2CLNG`;
  - Street View: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=LAT%2CLNG`.
- São links comuns (`rel="noopener noreferrer"`, `target` padrão). O texto avisa "abre o Google Maps". A ficha passa a receber latitude e longitude.

### D8. Testes
- Vitest: montagem do GeoJSON (só obras com coordenadas, propriedades certas) e das URLs do Google (formato e codificação).
- Playwright: a página continua com SVG e lista sem JavaScript; com JavaScript, o canvas do mapa aparece; toque num pino abre o resumo com link; filtro "Paralisada" reduz o GeoJSON a um ponto; nenhuma requisição sai para outro domínio; links da ficha com e sem coordenadas.
- O CI precisa do arquivo do mapa. Usamos um recorte pequeno de teste (zoom até 10, poucas centenas de KB) versionado em `web/e2e/fixtures/`, apontado por variável só nos testes.

## Risks / Trade-offs

- [49 MB no deploy] → Fica fora do Git; o navegador lê só os pedaços que precisa (`Range`), em geral poucas centenas de KB por visita.
- [Mapa de fundo desatualizado] → OpenStreetMap muda pouco para o uso aqui; atualizar o recorte é rodar o script com uma nova data e um novo hash.
- [WebGL indisponível em aparelho antigo] → Detectado na criação do mapa; nesse caso fica o SVG.
- [Peso do MapLibre, ~250 KB comprimido] → Só em `/obras`, carregado depois do conteúdo e quando o mapa entra na tela.

## Migration Plan

Sem migração de banco. O deploy precisa rodar `fetch-basemap` antes do build.
