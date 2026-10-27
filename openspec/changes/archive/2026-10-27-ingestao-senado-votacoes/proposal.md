# Ingestão do Senado: votações do Plenário

## Why

A change `ingestao-camara-votacoes` trouxe as votações da Câmara; o "Como votou" dos senadores ainda mostra "—", e o feed e o placar por estado (changes 24 e RF-31) precisam das duas casas. O Senado tem regras próprias: muitas votações são secretas (em 2025, 72 de 128) e o arquivo de votos registra também quem estava ausente e por quê.

## What Changes

- **Fonte:** API de dados abertos do Senado (OpenAPI em `legis.senado.leg.br/dadosabertos/v3/api-docs`, conferida em 2026-10-27):
  - `GET /dadosabertos/votacao.json?dataInicio&dataFim` (até um ano por pedido): votações do Plenário com os votos individuais das nominais;
  - `GET /dadosabertos/plenario/votacao/orientacaoBancada/{inicio}/{fim}.json`: orientação de cada liderança e a contagem oficial.
  Dois pedidos por ano, dentro do limite de 10 por segundo.
- **Votação secreta:** guardada com os totais oficiais e **sem nenhum voto individual** (o Senado só informa quem votou, não como).
- **Votação nominal:** voto de cada senador: sim, não, abstenção, presidente (que não vota), presente sem registrar voto, ausente (com o motivo informado: atividade parlamentar, missão, licença, não compareceu) ou não informado. Ligado ao cadastro pelo código do Senado; quem não está no cadastro também é guardado, para o placar.
- **Contagem conferida** com a contagem oficial do arquivo de orientações, com a mesma regra da Câmara (nota de qualidade e sem votos individuais quando não confere; mais de 5% falha o ano).
- **Perfil:** "Como votou" passa a valer também para senadores, com os mesmos campos e os motivos de ausência como o Senado informa.

## Fora de escopo

- Feed, página da votação, relevância (changes 22 a 24); comissões; presença em votação secreta.

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `votacoes`: inclui o Plenário do Senado, votações secretas e votos de ausência.
- `perfil-do-politico`: "Como votou" deixa de ser "—" para senadores.

## Impact

- Migração: `core.votes.secret`, `core.vote_ballots.option_detail` e novas opções de voto.
- `collectors`: job `votes` no adaptador `senado`; modelo e testes.
- `web`: "Como votou" para senadores; seed e testes.
