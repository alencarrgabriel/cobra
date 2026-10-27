# Ingestão da Câmara: votações do Plenário

## Why

As votações são a base do feed "O que aconteceu" (RF-10, RF-11), da página da votação com placar por partido e por UF (RF-14), do placar por estado no mapa (RF-31) e do "Como votou" no perfil, que hoje mostram "—". Esta change traz as votações do Plenário da Câmara; o Senado vem na change 20, e o feed e a página da votação na change 24.

## What Changes

- **Fonte:** arquivos anuais de dados abertos da Câmara (`dadosabertos.camara.leg.br/arquivos/`), da 57ª legislatura (2023 em diante):
  - `votacoes-<ano>.csv`: cada votação, com data, órgão, descrição, resultado e contagem;
  - `votacoesVotos-<ano>.csv`: o voto de cada deputado nas votações nominais;
  - `votacoesOrientacoes-<ano>.csv`: a orientação de cada liderança e bancada;
  - `votacoesProposicoes-<ano>.csv`: a proposição de cada votação.
  Arquivos anuais em vez da API: quatro pedidos por ano em vez de milhares, dentro do limite da fonte.
- **Só o Plenário** (órgão `PLEN`); comissões ficam fora.
- **Nominal e simbólica:** votação com votos individuais é nominal; sem votos individuais é simbólica e nunca atribui voto a ninguém (DDR §9.2).
- **Voto de todo deputado que votou**, mesmo de quem não está no cadastro, com partido e UF na data, para que o placar por partido e por UF seja completo; ligado ao político do cadastro pelo id da Câmara quando houver.
- **Orientações** das lideranças (Governo, Oposição, Maioria, Minoria, partidos e blocos), base do critério de relevância (change 22).
- **Perfil:** "Como votou" mostra as últimas votações nominais do Plenário em que o deputado votou, com a data, a proposição, o resultado e o voto. Para senadores e distritais, segue "—" com o motivo.

## Fora de escopo

- Ausência: quem estava em exercício e não votou aparece como "ausente" no feed (change 24), que cruza com os mandatos.
- Relevância e resumos (changes 22 e 23), página da votação (change 24).
- Votações de comissões e de legislaturas anteriores.

## Capabilities

### New Capabilities
- `votacoes`: votações do Plenário da Câmara, votos e orientações.

### Modified Capabilities
- `perfil-do-politico`: "Como votou" deixa de ser "—" para deputados federais.

## Impact

- Migração `core.votes`, `core.vote_ballots`, `core.vote_orientations`.
- `collectors`: job `votes` no adaptador `camara`; modelo e testes.
- `web`: consulta e bloco "Como votou" no perfil; seed e testes.
