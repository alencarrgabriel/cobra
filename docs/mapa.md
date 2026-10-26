# Mapa de ruas

O mapa da página de obras usa um mapa de ruas próprio, servido pelo site. Nenhum conteúdo vem de terceiros (change `mapa-de-obras`, design D1 e D2).

## Peças

| Peça | Onde fica | Origem e licença |
|---|---|---|
| Ruas, bairros e nomes (arquivo PMTiles) | `web/public/mapa/df.pmtiles`, fora do Git | Recorte da build diária do [Protomaps](https://docs.protomaps.com/), dados do OpenStreetMap (ODbL) |
| Fontes do mapa | `web/public/mapa/fonts/` | `protomaps/basemaps-assets`, Noto Sans (OFL, ver `OFL.txt`); só as faixas latinas |
| Ícones do mapa | `web/public/mapa/sprites/` | `protomaps/basemaps-assets` |
| Worker do MapLibre | `web/public/mapa/lib/`, fora do Git | Copiado do pacote `maplibre-gl` a cada build |
| Recorte de teste (zoom até 10) | `web/e2e/fixtures/df-test.pmtiles` | O mesmo recorte, menor, usado nos testes e no CI |

O crédito "© OpenStreetMap" e "Protomaps" aparece no canto do mapa, como pedem as licenças.

## Colocar o arquivo no lugar

```sh
pnpm --filter web basemap        # mapa completo (49 MB)
pnpm --filter web basemap:test   # recorte de teste (1,5 MB)
```

O script `web/scripts/fetch-basemap.mjs` confere o SHA-256 registrado em `web/basemap.json` e procura o arquivo, nesta ordem:

1. caminho em `BASEMAP_FILE`;
2. `data/basemap/<arquivo>` na raiz do repositório (fora do Git);
3. `url` em `web/basemap.json`, quando o arquivo estiver hospedado.

Sem o arquivo, a página de obras continua funcionando e mostra o mapa simplificado (contorno do DF).

## Gerar um recorte novo

1. Baixe o CLI `pmtiles` em [github.com/protomaps/go-pmtiles/releases](https://github.com/protomaps/go-pmtiles/releases) e confira o SHA-256 informado na página da versão.
2. Escolha a build do dia em [maps.protomaps.com/builds](https://maps.protomaps.com/builds).
3. Recorte o DF:

   ```sh
   pmtiles extract https://build.protomaps.com/AAAAMMDD.pmtiles data/basemap/df-AAAAMMDD.pmtiles \
     --bbox=-48.35,-16.10,-47.25,-15.45
   pmtiles extract data/basemap/df-AAAAMMDD.pmtiles web/e2e/fixtures/df-test.pmtiles --maxzoom=10
   ```

4. Atualize `web/basemap.json` (build, arquivo, `sha256`, `bytes`) dos dois recortes e rode `pnpm --filter web basemap`.
