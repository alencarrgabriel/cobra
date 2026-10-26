# Tasks

## 1. Arquivo do mapa

- [ ] 1.1 `web/basemap.json` com a build fixada, bbox, SHA-256 e tamanho; `web/scripts/fetch-basemap.mjs` (baixa ou copia de `BASEMAP_FILE`, confere o hash, grava em `public/mapa/df.pmtiles`); `.gitignore`; documentar em `docs/` como gerar um novo recorte com o CLI `pmtiles`
- [ ] 1.2 Fontes Noto Sans e ícones `light`/`dark` de `protomaps/basemaps-assets` em `web/public/mapa/`, com o arquivo de licença OFL; recorte pequeno de teste em `web/e2e/fixtures/`
- [ ] 1.3 Confirmar que o servidor do Next responde `Range` com 206 para o PMTiles; se não, Route Handler com `Range`; teste

## 2. Mapa interativo

- [ ] 2.1 Dependências `maplibre-gl` (versão com duas semanas ou mais), `pmtiles`, `@protomaps/basemaps`; build CSP do MapLibre com o worker servido pelo site; CSP sem novos domínios
- [ ] 2.2 `web/src/lib/works/geojson.ts` (pinos para GeoJSON com nome, situação, valor e percentual) e consulta de pinos com valor e percentual; testes Vitest
- [ ] 2.3 `WorksMapInteractive` (client, `next/dynamic`, criado ao entrar na tela): fundo Protomaps em português, tema claro/escuro, grupos com número, toque no grupo aproxima, pino com cor da situação, resumo com link para a ficha (DOM + `textContent`), crédito OSM/Protomaps, rótulo acessível; SVG atual como alternativa sem JavaScript ou sem WebGL
- [ ] 2.4 Testes Playwright: canvas aparece; resumo do pino com link; filtro "Paralisada" vale para o mapa; sem JavaScript a lista e o SVG aparecem; nenhuma requisição a outro domínio; axe nos dois temas

## 3. Links para o Google Maps

- [ ] 3.1 `web/src/lib/works/external-map.ts` com as três URLs oficiais; testes Vitest de formato e codificação
- [ ] 3.2 Ficha: latitude e longitude na consulta; links "Ver no Google Maps", "Como chegar" e "Street View" com o aviso de serviço externo; nada para obra sem localização; testes Playwright

## 4. Integração final

- [ ] 4.1 CI: rodar `fetch-basemap` com o recorte de teste; conferir o peso de `/obras` (o código do mapa fora do carregamento inicial)
- [ ] 4.2 Ver o mapa com os dados reais (1.136 pinos) no celular e no computador, nos dois temas; rodar `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
