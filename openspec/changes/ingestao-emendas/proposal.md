# Proposal

## Why

O foco do Cobra é "de onde veio cada real" na cidade (DDR 3.0). As obras do DF já estão no banco, mas não se sabe quais foram pagas com emendas parlamentares nem quem as indicou (RF-42, RF-43). Os 594 congressistas também já estão no banco, então dá para ligar a emenda a quem a fez.

## What Changes

- Valor `transparencia` na lista de fontes de dados (Portal da Transparência, CGU).
- Emendas parlamentares com destino ao DF, todos os anos disponíveis (2014–2026), a partir do arquivo de download em massa do Portal da Transparência:
  - `EmendasParlamentares.zip`, público e sem chave, atualizado diariamente;
  - conferido em 2026-10-26: 94.747 linhas no país e 1.278 com destino ao DF;
  - o DDR pede downloads em massa para o histórico.
- Autores de emenda (código do autor no orçamento, nome, tipo: individual, de bancada, de comissão ou de relator), ligados ao político do cadastro quando o nome parlamentar casa com exatamente um deputado ou senador. Bancadas e comissões ficam como autor sem político.
- Empenhos de cada obra do DF, a partir do Obrasgov.br (`/empenho`), com o campo que identifica a emenda que pagou o empenho.
- Vínculo obra–emenda com o grau de confiança (RF-43):
  - **direto**: o empenho da obra identifica a emenda, e ela está entre as emendas do DF;
  - **por município**: no DF há um único município, então não vira vínculo de cada obra (seria ligar toda obra a toda emenda). Fica como contagem de emendas do DF por área, para as telas;
  - **por convênio**: depende dos dados de convênios do Transferegov e fica para uma change futura.
- Testes com amostras reais (sem rede).

Requisitos do DDR cobertos: RF-28 (emendas por município, dados), RF-42, RF-43 (direto; por município como contagem; por convênio adiado), RF-34 (dados para o perfil), RNF-06, RNF-09, RNF-16, §6.1 (Portal da Transparência).

Fora de escopo:
- Telas (`perfil-do-politico`, ficha da obra).
- Emendas Pix com plano de trabalho (RF-45, fase 3).
- Emendas fora do DF, de destino nacional ou "múltiplo".
- Vínculo por convênio.
- A API do Portal da Transparência, que exige chave: o download basta.

## Capabilities

### New Capabilities

- `emendas-parlamentares`: quais dados de emendas o Cobra guarda, de onde vêm, como o autor vira político e como a emenda é ligada à obra, com o grau de confiança.

### Modified Capabilities

- `rastreabilidade-de-dados`: a lista de fontes conhecidas passa a incluir o Portal da Transparência.
- `obras-federais`: o Obrasgov também fornece os empenhos de cada obra.

## Impact

- Migração nova:
  - valor `transparencia` em `core.data_source`;
  - tabelas `core.amendment_authors`, `core.amendments` e `core.work_commitments`;
  - visão `core.work_amendment_links`.
- Adaptador novo `transparencia`; tarefa nova `commitments` no adaptador `obrasgov` (mais 1.147 requisições por carga, cerca de 10 minutos a 2 req/s).
- `docs/modelo-de-dados.md` e `docs/coleta.md`.
