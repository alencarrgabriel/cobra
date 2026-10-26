# Proposal

## Why

O mapa de `obras-na-cidade` é um desenho do contorno do DF com pontos: dá para ver onde há mais obras, mas não em que rua ou bairro fica cada uma. Painéis oficiais, como o do Obrasgov.br no Serpro, mostram as obras sobre um mapa de verdade. O cidadão quer ver a obra perto de casa e chegar até ela. As coordenadas já estão no banco (1.136 das 1.147 obras do DF).

## What Changes

- O mapa de `/obras` passa a ser um mapa interativo, com ruas, bairros e nomes de lugares em português, zoom e arrasto (RF-46):
  - biblioteca de código aberto MapLibre GL JS;
  - mapa de fundo próprio: recorte do DF da base Protomaps (dados OpenStreetMap), num único arquivo servido pelo próprio site. Sem chave de API, sem custo por acesso e sem mandar dados de quem visita para terceiros (RNF-12);
  - pinos coloridos pela situação, que se agrupam com o número de obras quando o zoom está afastado e se separam ao aproximar;
  - ao tocar num pino, um resumo da obra (nome, situação, valor, percentual) com link para a ficha;
  - continua respeitando os filtros da página; legenda e contagem das obras sem localização seguem abaixo do mapa;
  - tema claro e escuro, crédito "© OpenStreetMap" e "Protomaps" visível.
- Sem JavaScript, ou enquanto o mapa carrega, a página continua útil: a lista e a contagem aparecem normalmente, e o mapa SVG atual fica como alternativa.
- Na ficha de cada obra com coordenadas: links "Ver no Google Maps", "Como chegar" e "Street View", que abrem o Google Maps só quando o cidadão clica. Nenhum conteúdo do Google é carregado pelo site.
- O arquivo do mapa (cerca de 49 MB) não vai para o repositório: um script baixa uma versão fixa, confere o hash e guarda o arquivo para o build e para o deploy.

Fora de escopo: camada de satélite (fica para quando houver o Brasil inteiro e demanda), mapa de outras UFs, mapa na ficha da obra, busca por endereço.

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `obras-na-cidade`: o requisito do mapa passa a exigir mapa com ruas, agrupamento de pinos e resumo ao tocar, servido sem terceiros; novo requisito de links para abrir a obra no Google Maps.

## Impact

- Pré-requisito: arquivar `obras-na-cidade` antes, para que o requisito do mapa exista em `openspec/specs/`.
- Dependências novas no site: `maplibre-gl`, `pmtiles`, `@protomaps/basemaps`; fontes e ícones do mapa (repositório `protomaps/basemaps-assets`, licença OFL) guardados no site.
- Política de segurança (CSP): permitir o worker do mapa sem abrir domínios externos.
- Peso: o código do mapa só carrega na página de obras, depois do conteúdo principal (RNF-01).
- Novo script de build para baixar e conferir o arquivo do mapa; CI e deploy rodam esse script.
