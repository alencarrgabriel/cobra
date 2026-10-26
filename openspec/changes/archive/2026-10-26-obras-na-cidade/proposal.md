# Proposal

## Why

As 1.147 obras com recurso federal do DF já estão no banco (`ingestao-obrasgov`), mas ninguém consegue vê-las. Esta change entrega a primeira tela com dados reais do foco do DDR 3.0, "dinheiro e promessas na sua cidade": o cidadão abre "Obras" e vê quantas obras existem, quanto custam, quais estão paradas e por quê, no mapa e numa lista, e abre a ficha de cada uma.

## What Changes

- Conexão do site ao banco próprio, somente leitura, pela variável `WEB_DATABASE_URL` (opcional: sem ela o site continua no ar e a página de obras explica que os dados estão indisponíveis). O site nunca consulta a API do Obrasgov.
- Página `/obras` (piloto: Distrito Federal):
  - resumo com total de obras, valor previsto, valor executado conhecido e contagem por situação (RF-48);
  - filtros por situação e por área, guardados no endereço da página para poder compartilhar (RF-49, RF-60);
  - mapa do DF com pinos coloridos por situação, cada pino levando à ficha (RF-46);
  - lista paginada com critério de ordem declarado (valor previsto ou nome), sem destaque editorial;
  - data da última atualização do Obrasgov e data da coleta (RF-44).
- Página `/obras/<código>` (ficha da obra, RF-39): situação, há quanto tempo está paralisada e o motivo oficial (RF-41), valores, prazos previstos e reais, percentual de execução, quem repassa, recebe e executa, notas de qualidade, histórico e link para conferir na fonte. Código = identificador do Obrasgov, um link permanente.
- A seção "Obras" da navegação deixa de ser "em breve".
- Testes de navegador com um banco de teste próprio, criado a cada execução com migrações e dados de exemplo, também no CI.

Requisitos do DDR cobertos: RF-39, RF-40, RF-41, RF-44, RF-46, RF-48, RF-49, RF-60 (obras), RNF-01, RNF-04, RNF-13, RNF-15.

Fora de escopo: busca por CEP (`busca-geografica`), emendas e parlamentar ligado à obra (`ingestao-emendas`), painel de compartilhar e cards (`compartilhamento`), plano de governo ao lado (`plano-de-governo`), outras UFs.

## Capabilities

### New Capabilities

- `obras-na-cidade`: o que o cidadão vê sobre as obras com recurso federal do lugar onde mora: resumo, filtros, mapa, lista e ficha de cada obra, sempre com fonte e data.

### Modified Capabilities

(nenhuma)

## Impact

- Novos: `web/src/lib/db.ts`, `web/src/lib/works/` (consultas e formatação), `web/src/app/obras/`, `web/src/components/WorkStatus/`, `web/src/components/WorksMap/`, `web/src/lib/geo/df-boundary.json` (limite do DF, IBGE), testes e dados de exemplo em `web/e2e/`.
- Alterados: esquema de configuração do site (`WEB_DATABASE_URL`), `.env.example`, seção "Obras" da navegação, `ci.yml` (Postgres no job do site), dependência `postgres` (driver).
