# Design

## Context

`core.votes` (Câmara e Senado) tem contagem oficial (`yes`, `no`, `other`), tipo da proposição e `nominal`; `core.vote_orientations` tem as bancadas como cada casa escreve, com "Governo" e "Oposição" nas duas (Câmara: 1.127 votações com as duas; Senado: 136 e 116). Antes da correção, todas as 1.128 votações nominais da Câmara estavam sem proposição.

## Decisions

### D1. Critérios numa visão
- `core.vote_relevance(vote_id, criteria text[], government, opposition, margin, voters)`: calculada a partir das tabelas, sem cópia; muda sozinha quando a coleta muda.
- `divergencia`: orientações de "Governo" e "Oposição" ambas em (`sim`, `nao`, `obstrucao`) e diferentes. "Liberado", "não informada" e ausência de orientação não contam.
- `placar_disputado`: votantes = `yes + no + other` (a contagem oficial); `abs(yes − no) < 0,2 × votantes`, com votantes > 0.
- `tipo_de_materia`: `proposition_type` em (`PEC`, `MPV`, `PLP`, `PLN`, `VET`).
- `curadoria`: existe linha em `core.vote_curation` (justificativa, quem, quando), preenchida pelo painel editorial (change 23).
- Só votações nominais; simbólicas e secretas nunca são "votação relevante" (não há voto individual a mostrar).
- Alternativa: gravar os critérios no coletor. Rejeitada: duas fontes de verdade, e a curadoria vem do painel, não da coleta.

### D2. Eventos
- `core.events(kind, occurred_on, house, vote_id, criteria)`: `votacao_relevante` para nominal com critério; `votacao_simbolica` para simbólica com proposição. Secretas do Senado ficam fora (sem voto individual nem proposição a acompanhar de forma útil no feed; entram como contagem na página da votação, change 24).

### D3. Proposição da Câmara
- `main_proposition(id_indicado, listadas)`: a indicada, se listada e não for requerimento (`REQ`, `RCP`, `INC`, `RIC`); senão a primeira matéria que não seja requerimento; senão a primeira listada.

### D4. Perfil
- Em "Como votou", a votação com critério mostra "Votação relevante:" e os critérios em palavras ("Governo e Oposição divergiram", "placar disputado", "tipo de matéria: PEC").

### D5. Testes
- Banco: a visão marca cada critério e combinações; simbólica fica fora; curadoria entra.
- Coletor: escolha da proposição.
- Site: indicação no perfil (Playwright).
