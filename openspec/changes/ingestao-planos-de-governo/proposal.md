# Proposal

## Why

"Dinheiro e promessas na sua cidade" (DDR 3.0): ao lado das obras e emendas, o cidadão quer ver o que quem governa prometeu. O plano de governo registrado no TSE é documento oficial do mandato (DDR §12). O MVP traz o do presidente e o do governador do DF em exercício (RF-80), organizado por tema e com busca por palavra (RF-81), e ligado às obras da mesma área (RF-82, na tela). Esta change traz os planos para o banco. A tela é a change `plano-de-governo`.

## What Changes

- Fonte: arquivos do TSE, conferidos em 2026-10-26.
  - Planos de 2022: `cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/proposta_governo_2022_<UF>.zip`. O do DF tem 19 MB e 12 PDFs; o nacional (`BR`), 16 MB e 13 PDFs.
  - Candidatos de 2022: `consulta_cand_2022.zip`, para saber de quem é cada PDF (o nome do arquivo traz o número do candidato no TSE) e quem foi eleito.
- Escopo do piloto: as chapas eleitas em 2022 para presidente (Lula e Alckmin) e para governador do DF (Ibaneis Rocha e Celina Leão). O plano é da chapa, então continua valendo quando o vice assume.
- O que fica guardado:
  - o plano: eleição, cargo, UF, chapa, partido, número do candidato no TSE e endereço e hash do PDF;
  - o PDF oficial, guardado inteiro como bruto e servido pelo próprio site para o link de página;
  - o texto de cada página;
  - os temas de cada página.
- Temas por lista fixa de palavras (sem IA): saúde, educação, segurança, mobilidade, água e saneamento, assistência social, cultura, esporte, meio ambiente, economia e emprego, moradia. Cada tema já diz quais áreas de obra correspondem a ele, para o RF-82.
- Busca por palavra no texto das páginas, com o dicionário do português.
- CPF e outros dados pessoais do arquivo de candidatos não são guardados (coleta mínima).

Requisitos do DDR cobertos: RF-80 e RF-81 (dados), RF-82 (correspondência entre tema e área de obra), RNF-04, RNF-16, §6.1 (TSE, planos de governo), §10.1 (coleta mínima).

Fora de escopo:
- Telas (`plano-de-governo`).
- Planos dos outros 26 governadores e dos prefeitos (RF-83, fase 2).
- Comparador de candidatos (RF-84, fase 3, após parecer).
- Resumo do plano: o DDR permite rascunho por IA só com aprovação humana, o que depende do `painel-editorial`.
- Ligar o plano ao cadastro de políticos: vem com `ingestao-tse`.

## Capabilities

### New Capabilities

- `planos-de-governo`: quais planos de governo o Cobra guarda, de onde vêm, como o texto e os temas de cada página são extraídos e como se busca neles.

### Modified Capabilities

(nenhuma: o TSE já está na lista de fontes.)

## Impact

- Migração nova: `core.government_plans`, `core.government_plan_pages` (com índice de busca em português), `core.plan_themes`.
- Adaptador novo `tse` (módulo `tse_planos.py`), com a dependência `pypdf` (BSD, versão 6.20.1).
- PDFs: guardados pelo coletor como bruto; como o site os serve fica decidido no design.
- `docs/coleta.md` e `docs/modelo-de-dados.md`.
