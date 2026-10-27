# Design

## Context

`/dadosabertos/votacao` (OpenAPI conferida em 2026-10-27) exige um filtro; com `dataInicio` e `dataFim`, o intervalo vai até um ano. Em 2025: 128 votações (126 do Plenário do Senado), 2,4 MB. Cada item traz `codigoSessaoVotacao`, `sequencialVotacao`, `dataSessao`, `descricaoVotacao`, `identificacao` ("PLP 55/2026"), `ementa`, `codigoMateria`, `resultadoVotacao` (A ou R), `votacaoSecreta` (S ou N), `totalVotosSim/Nao/Abstencao` (só nas secretas) e `votos` com `codigoParlamentar`, `nomeParlamentar`, `siglaPartidoParlamentar`, `siglaUFParlamentar` e `siglaVotoParlamentar`.

Valores de `siglaVotoParlamentar` em 2025: Sim, Não, Abstenção, Votou (só nas secretas), P-NRV (presente, não registrou voto), AP (atividade parlamentar), MIS (missão), LS (licença saúde), LP (licença particular), NCom (não compareceu), NA, "Presidente (art. 51 RISF)".

`/plenario/votacao/orientacaoBancada/{inicio}/{fim}.json` traz, por `sequencialVotacao`, `qtdVotosSim`, `qtdVotosNao` e `orientacoesLideranca` (`partido`, `voto`: SIM, NÃO, LIVRE, OBSTRUÇÃO ou nulo). Em 2025, 53 das 56 votações nominais têm o registro e a contagem bate com os votos individuais em todas.

## Decisions

### D1. Job `votes` no adaptador `senado`
- Um por ano, de 2023 ao ano corrente; dois pedidos (votações e orientações) com o sufixo `.json`.
- Mesmo esquema da Câmara (`core.votes`, `core.vote_ballots`, `core.vote_orientations`), casa `senado`, `source_id` = `codigoSessaoVotacao`; o ano é regravado inteiro.
- Só itens do Plenário do Senado (`casaSessao = SF`).

### D2. Secretas
- Nova coluna `core.votes.secret`. Votação secreta: `nominal = false`, `secret = true`, totais de `totalVotos*`, nenhuma linha em `vote_ballots` (o "Votou" não é guardado).

### D3. Opções de voto
- `sim`, `nao`, `abstencao`; `presidente` (art. 51, não vota); `presente_sem_voto` (P-NRV); `ausente` (AP, MIS, LS, LP, LAP, NCom); `nao_informado` (NA e vazio). O motivo (`option_detail`) é a descrição oficial do Senado (`descricaoVotoParlamentar`, ex.: "Licença paternidade ou ao adotante"), ou o código quando ela não vem.
- Valor desconhecido falha o job.
- Nova coluna `core.vote_ballots.option_detail` (texto, nulo na Câmara).

### D4. Contagem
- Pela contagem oficial do arquivo de orientações (`qtdVotosSim`, `qtdVotosNao`); sem registro de orientação, a votação é publicada sem conferência. Regra de divergência igual à da Câmara (D5 de `ingestao-camara-votacoes`).

### D5. Perfil
- "Como votou" vale para senadores: mesmas 10 votações nominais mais recentes com voto registrado; textos: "Presidente da sessão (não vota)", "Presente, sem registrar voto" e "Ausente: <motivo como o Senado escreve>".
- Nota: "Votações secretas não têm voto individual."

### D6. Testes
- Modelo: opções e ausências, secreta sem votos, conferência pela orientação.
- Banco: job com respostas gravadas; secreta sem voto individual.
- Site: "Como votou" de senadora com seed (Playwright).
