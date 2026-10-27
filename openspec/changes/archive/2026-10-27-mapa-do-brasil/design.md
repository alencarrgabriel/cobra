# Design

## Context

O IBGE publica a malha das UFs na API de malhas v3 (`/api/v3/malhas/paises/BR?intrarregiao=UF`, formatos SVG, GeoJSON e TopoJSON, qualidades máxima, intermediária e mínima; documentação consultada em 2026-10-27 em servicodados.ibge.gov.br/api/docs/malhas?versao=3). A página `/representantes/<código>` já aceita o código de 2 dígitos da UF e mostra a bancada.

## Goals / Non-Goals

**Goals:** mapa leve, sem JavaScript, acessível e neutro; exemplos de cards escolhidos por regra objetiva.

**Non-Goals:** mapa interativo com zoom, cores por dado, placar real.

## Decisions

### D1. Malha gerada uma vez
- `scripts/build-br-map.mjs` baixa o GeoJSON de qualidade mínima (≈100 KB), projeta em equirretangular com a longitude encolhida pelo cosseno da latitude média e grava `src/lib/geo/br-map.json` (caminhos SVG com uma casa decimal, ≈60 KB, `viewBox` 950×976), com a URL e a data.
- Alternativa: o SVG pronto da API. Rejeitada porque não traz o identificador de cada estado de forma estável para virar link.
- Alternativa: MapLibre, já usado nas obras. Rejeitada: pesado para 27 polígonos e exige WebGL.

### D2. Componente `BrazilMap` (servidor, sem JavaScript)
- `<svg role="group" aria-label="Mapa do Brasil">` com um `<a href="/representantes/<código>">` por estado, com `aria-label` "<Estado>: ver a bancada" e `<title>`.
- Preenchimento único (`--surface`), borda `--line`; `:hover` e `:focus-visible` usam `--accent`. Nenhuma cor de partido ou escala.
- Ao lado, lista dos 27 estados (bandeira + nome, ordem alfabética pelo nome), com os mesmos links.

### D3. Placar na página do lugar
- Bloco "Placar das votações recentes" com "—" e o motivo, como no perfil (`NOT_YET`). Será trocado pelo placar real nas changes de votações.

### D4. Exemplos de cards (RF-69)
- Dois cards no formato feed, imagens já geradas por `/cartao/...`: representantes do DF (`53`) e a obra do DF com `source_updated_at` mais recente (empate: menor código). A regra aparece na legenda.
- Não há exemplo de perfil, para não escolher um político.
- O bloco lê o banco por pedido (consulta em cache), para que o build não congele o exemplo.

### D5. Testes
- Vitest: o JSON tem as 27 UFs, cada uma com caminho e código que batem com a tabela de bandeiras.
- Playwright: o mapa tem 27 links que levam a `/representantes/<código>`; o DF leva a `/representantes/53`; a lista tem 27 estados em ordem alfabética; a página do lugar mostra o placar com "—"; os exemplos de cards apontam para as rotas de cartão e respondem PNG; axe nos dois temas.
