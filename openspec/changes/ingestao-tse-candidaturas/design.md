# Design

## Context

O TSE publica, por eleição, `consulta_cand_<ano>.zip` e `votacao_candidato_munzona_<ano>.zip` em `cdn.tse.jus.br/estatistica/sead/odsele/` (catálogo CKAN `dadosabertos.tse.jus.br`, conjuntos `candidatos-<ano>` e `resultados-<ano>`, conferidos em 2026-10-27). Os CSVs são em latin-1, separados por `;`, um por UF, com o mesmo cabeçalho de 1994 a 2024 (conferido em 1994 e 2022). Valores ausentes vêm como `#NE`, `#NULO#`, `-1` ou `-3`. Em 1994 não há CPF (`-3`), mas há `DT_NASCIMENTO`. `CD_TIPO_ELEICAO = 2` é a eleição ordinária. `SQ_CANDIDATO` liga candidatura e votos.

Tamanhos (HEAD em 2026-10-27): candidaturas de 1 MB (1994) a 140 MB (2016); votos de 19 MB (1996) a 565 MB (2022). O `HttpClient` atual lê a resposta inteira na memória e o `RawStore` grava `response.content`.

O cadastro tem 621 políticos, todos com data de nascimento; o CPF (em `restricted.politician_private_ids`) existe para os deputados federais.

## Goals / Non-Goals

**Goals:** trajetória completa e verificável dos políticos do cadastro; coleta mínima; arquivos grandes sem estourar a memória.

**Non-Goals:** base de todos os candidatos do Brasil; votos por zona; bens e contas.

## Decisions

### D1. Download em streaming
- `HttpClient.stream(url)` abre a resposta em streaming, com as mesmas retentativas e o limitador.
- `RawStore.save_stream(...)` copia em pedaços para um arquivo temporário, calcula o SHA-256 durante a cópia, move para `<raw>/<fonte>/<ano>/<mês>/<sha>.zip` e registra `raw.responses` com caminho e tamanho.
- `Context.fetch_file(url) -> SavedRaw` junta os dois. Requisito "Resposta bruta guardada" continua valendo.

### D2. Jobs
- `candidacies` por ano (16 anos: 1994 a 2024, de dois em dois): baixa o arquivo, lê só as colunas necessárias, liga ao cadastro (D3) e grava em `core.candidacies`; ao terminar, enfileira `votes` do mesmo ano na mesma transação.
- `votes` por ano: lê o arquivo de votos em streaming, soma `QT_VOTOS_NOMINAIS` por (`SQ_CANDIDATO`, `NR_TURNO`) **só para as candidaturas já guardadas**, e atualiza `votes`.
- O adaptador `tse` passa a ser `TseSource`, que reúne os jobs de planos (`plans`) e os novos.

### D3. Ligação ao cadastro
1. CPF de 11 dígitos no arquivo igual ao CPF guardado de um político → esse político.
2. Senão, nome civil normalizado (sem acento, maiúsculas, espaços únicos) e data de nascimento iguais a **exatamente um** político → esse político; se o arquivo traz CPF e o político tem outro CPF conhecido, não liga.
3. Senão, a candidatura é ignorada (não é de alguém do cadastro).
- Guardamos a regra usada (`cpf` ou `nome-e-nascimento`) em cada linha.
- Validação: um ano de eleição geral recente (2018 ou 2022) precisa ligar ao menos 400 candidaturas; um arquivo sem as colunas esperadas falha o job.

### D4. Tabela `core.candidacies`
- `politician_id`, `election_year`, `round`, `office` (texto do TSE, ex.: "DEPUTADO FEDERAL"), `uf`, `unit_name` (NM_UE), `party_acronym`, `ballot_name`, `ballot_number`, `candidacy_status` (DS_SITUACAO_CANDIDATURA), `result` (DS_SIT_TOT_TURNO), `votes` (nulo até o job de votos), `tse_candidate_id` (SQ_CANDIDATO), `match_rule`.
- Valores ausentes do TSE (`#NE`, `#NULO#`, `-1`, `-3`) viram nulo.
- Chave `(source, source_id)` com `source_id = <SQ_CANDIDATO>-<turno>`. Proveniência completa.
- Leitura pelo site (`cobra_web_reader`): só dados públicos da candidatura.

### D5. Perfil
- Seção "Trajetória eleitoral" entre "Mandatos e partidos" e "Emendas": lista do mais recente ao mais antigo, com ano, cargo, local, partido, votos (ou "—" quando o TSE não informa) e resultado.
- Resultado em português simples e neutro em gênero: "Eleito(a)", "Eleito(a) por quociente partidário", "Eleito(a) por média", "Suplente", "Não eleito(a)", "Foi ao 2º turno"; outro valor aparece como o TSE escreve; ausente, "—".
- "Partidos pelos quais disputou": sequência dos partidos na ordem dos anos, sem repetir seguidos.
- Fonte e data de coleta. Nada de soma de votos nem contagem de vitórias (seria um placar).

### D6. Testes
- Modelo (pytest): leitura das colunas, nulos do TSE, normalização de nome, regras de ligação (CPF, nome e nascimento, ambíguo, CPF divergente), soma de votos por turno.
- Banco: job `candidacies` com ZIP de fixture liga só o político certo e não guarda CPF; `votes` soma e atualiza; download em streaming grava arquivo e hash.
- Site: rótulos de resultado (Vitest); seção no perfil com seed (Playwright).

## Risks / Trade-offs

- Homônimo com mesma data de nascimento → regra "exatamente um" e CPF divergente impede.
- Nome civil mudou (casamento) e sem CPF → a disputa antiga não aparece; aceito e documentado.
- 3,5 GB de download → jobs por ano, retentativa, arquivo bruto reaproveitado pelo hash.
