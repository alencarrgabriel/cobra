# Design

## Context

A Câmara publica arquivos anuais em `https://dadosabertos.camara.leg.br/arquivos/<conjunto>/csv/<conjunto>-<ano>.csv` (conferidos em 2026-10-27, atualizados diariamente; UTF-8 com BOM, `;`): `votacoes` (2026: 4,5 MB, 7.439 votações, 1.380 do Plenário), `votacoesVotos` (2025: 58 MB), `votacoesOrientacoes` e `votacoesProposicoes`. Colunas usadas:
- votações: `id`, `data`, `dataHoraRegistro`, `siglaOrgao`, `aprovacao` (1, 0 ou vazio), `votosSim`, `votosNao`, `votosOutros`, `descricao`, `ultimaApresentacaoProposicao_idProposicao`;
- votos: `idVotacao`, `dataHoraVoto`, `voto` (Sim, Não, Abstenção, Obstrução, Artigo 17 ou vazio), `deputado_id`, `deputado_nome`, `deputado_siglaPartido`, `deputado_siglaUf`;
- orientações: `idVotacao`, `siglaBancada`, `orientacao` (Sim, Não, Liberado, Obstrução ou vazio);
- proposições: `idVotacao`, `proposicao_id`, `proposicao_titulo` (ex.: "PL 11/2003"), `proposicao_ementa`, `proposicao_siglaTipo`, `proposicao_numero`, `proposicao_ano`.

Em 2026, 126 das 1.380 votações do Plenário têm votos individuais.

## Goals / Non-Goals

**Goals:** votações do Plenário completas, voto de cada deputado, orientações, separação clara entre nominal e simbólica.

**Non-Goals:** ausência, relevância, resumo, comissões, Senado.

## Decisions

### D1. Arquivos anuais
- Job `votes` por ano, de 2023 ao ano corrente, no adaptador `camara`: baixa os quatro arquivos em streaming (`Context.fetch_file`) e grava tudo do ano numa transação.
- Um ano é regravado inteiro (apaga votos e orientações das votações do ano e insere de novo com `COPY`), porque os arquivos mudam todo dia.

### D2. Tabelas
- `core.votes`: `house` (`camara`), `occurred_on`, `quality_notes` (texto[]), `registered_at`, `organ`, `description`, `approved` (booleano ou nulo), `yes`, `no`, `other`, `nominal`, e a proposição principal (`proposition_external_id`, `proposition_label`, `proposition_type`, `proposition_summary`, `proposition_url`). `source_id` = id da votação na Câmara.
- `core.vote_ballots`: `vote_id`, `external_id` (id do deputado), `name`, `party_acronym` e `uf` na data, `option` (`sim`, `nao`, `abstencao`, `obstrucao`, `art17`, `nao_informado`), `voted_at`, `politician_id` (nulo quando o deputado não está no cadastro).
- `core.vote_orientations`: `vote_id`, `bench` (como a Câmara escreve), `orientation` (`sim`, `nao`, `liberado`, `obstrucao`, `nao_informada`).
- Proveniência em todas.

### D3. Nominal e simbólica
- `nominal = true` quando o arquivo de votos tem ao menos um voto da votação; senão a votação é simbólica e não tem linha em `vote_ballots`.

### D4. Ligação ao cadastro
- Pelo id do deputado em `core.politician_external_ids` (sistema `camara`). Sem ligação, o voto fica guardado com nome, partido e UF, para o placar.

### D5. Validação
- Um ano com votações do Plenário precisa ter ao menos uma nominal.
- Contagem (DDR §6.2, "contagem de votos bate com o placar"): em cada votação nominal, os votos individuais "sim" e "não" precisam somar `votosSim` e `votosNao`. Se uma votação não bate, ela fica com o placar oficial, **sem votos individuais publicados**, e com a nota de qualidade "votos individuais não conferem com o placar oficial". Em 2026, 1 de 126 votações nominais tem os 466 votos em branco e placar 404 × 61.
- Se mais de 5% das votações nominais do ano não baterem, o job falha (arquivo provavelmente quebrado).
- Voto com opção desconhecida falha o job.

### D6. Perfil
- "Como votou": as 10 votações nominais mais recentes do Plenário em que o deputado registrou voto: data, proposição (rótulo e ementa), resultado e o voto em texto ("Sim", "Não", "Abstenção", "Obstrução", "Art. 17", "Não informado"), com link oficial da votação e fonte e data de coleta.
- Para quem não é deputado federal: "—" e "vem com a coleta das votações do Senado" (senadores) ou "a Câmara Legislativa ainda não está no Cobra" (distritais).
- Sem contagem de "votou com o governo" nem qualquer índice.

### D7. Testes
- Modelo: opções, nominal × simbólica, conferência da contagem, só Plenário.
- Banco: job grava votações, votos (ligados e não ligados) e orientações; regrava sem duplicar; contagem divergente não publica.
- Site: bloco "Como votou" com seed (Playwright).
