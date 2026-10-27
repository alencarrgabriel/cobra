# Ingestão do TSE: candidaturas e votos

## Why

O perfil enxuto do DDR 3.0 inclui a trajetória eleitoral desde 1994 (RF-36): cada disputa com ano, cargo, partido, votos e resultado, e a linha do tempo de partidos. Hoje o perfil mostra "Trajetória eleitoral — ainda não está no Cobra".

A change `ingestao-tse` do plano é grande demais para uma só (candidaturas, votos, bens e contas de campanha somam vários GB). Ela fica dividida em três: **esta** (candidaturas e votos), `ingestao-tse-patrimonio` (RF-37) e `ingestao-tse-doadores` (RF-26).

Requisitos cobertos: RF-36 e a parte "eleições vencidas e votos" fica fora da frase "Quem é" (RF-35), que segue como está.

## What Changes

- **Fonte:** arquivos abertos do TSE por eleição ordinária, de 1994 a 2024 (gerais e municipais):
  - `consulta_cand_<ano>.zip` (candidaturas, 1 a 140 MB por ano);
  - `votacao_candidato_munzona_<ano>.zip` (votos por município e zona, 19 a 565 MB por ano).
- **Só políticos do cadastro do Cobra:** uma candidatura é ligada a um político pelo CPF, quando o arquivo traz e o Cobra já conhece o CPF, ou pelo nome civil e data de nascimento iguais a exatamente um político. CPF diferente do conhecido impede a ligação. Nada de outros candidatos é guardado.
- **Coleta mínima:** do arquivo de candidatos ficam ano, turno, cargo, local, partido, nome de urna, número, situação e resultado. CPF, e-mail, título de eleitor, gênero, cor/raça, estado civil e instrução não são guardados.
- **Votos:** soma dos votos nominais do candidato em todas as zonas, por turno.
- **Download grande em disco:** o coletor ganha download em streaming direto para o diretório de dados brutos, com hash calculado durante a cópia, sem carregar o arquivo inteiro na memória.
- **Perfil:** seção "Trajetória eleitoral" com cada disputa (ano, cargo, local, partido, votos e resultado, como o TSE informa) e a linha do tempo dos partidos pelos quais disputou; sai da lista "Ainda não está no Cobra".

## Fora de escopo

- Patrimônio (RF-37) e doadores (RF-26): próximas changes.
- Eleições suplementares e plebiscitos.
- Votos por município no perfil (o Cobra guarda só o total).

## Capabilities

### New Capabilities
- `trajetoria-eleitoral`: candidaturas e votos do TSE ligados aos políticos do cadastro, e a seção do perfil.

### Modified Capabilities
- `perfil-do-politico`: a trajetória eleitoral sai da lista do que ainda não está no Cobra.

## Impact

- Migração `core.candidacies`.
- `collectors`: download em streaming (`http`, `raw`, `pipeline`), adaptador `tse` com os jobs `candidacies` e `votes`, testes.
- `web`: consulta e seção no perfil; seed e testes.
- Disco: cerca de 3,5 GB de arquivos brutos para a série completa.
