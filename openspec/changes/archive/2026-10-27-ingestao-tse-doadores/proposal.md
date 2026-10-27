# Ingestão do TSE: receitas e doadores de campanha

## Why

O DDR pede os doadores de campanha no perfil (RF-26) e, no §10, cuidado com os doadores pessoas físicas: dado público, mas de cidadãos comuns, sem busca aberta por nome. Em 2026-10-27 a decisão foi: **pessoas físicas só agregadas** (quantidade e valor); nomes só de partidos (e do próprio candidato, pelos recursos próprios); **nenhum CPF ou CNPJ guardado**.

## What Changes

- **Fonte:** `prestacao_de_contas_eleitorais_candidatos_<ano>.zip` do TSE, 2018 a 2024 (de 0,3 a 1,3 GB), lendo só o CSV nacional de receitas (`receitas_candidatos_<ano>_BRASIL.csv`, que soma os das UFs).
- **Só candidaturas do cadastro** já guardadas.
- **Agregado por candidatura, origem e fonte do recurso:**
  - origens: recursos próprios, pessoas físicas (inclui doações pela internet), partidos, financiamento coletivo, outros candidatos, outras (eventos, rendimentos, origem não identificada);
  - fontes: Fundo Especial de Financiamento de Campanha, Fundo Partidário, outros recursos;
  - pessoas físicas: só a quantidade de doadores e o total; o CPF é usado para contar e descartado;
  - partidos: o nome do diretório doador, como a Receita registra.
- **Perfil:** seção "Receitas de campanha" por eleição: total, quanto veio de cada origem e de cada fundo público, a quantidade de pessoas físicas doadoras e a lista dos partidos doadores em ordem alfabética. "Doadores" sai da lista "Ainda não está no Cobra".

## Fora de escopo

- Anos antes de 2018: o TSE usa outros arquivos e leiautes (`prestacao_contas_2010.zip`, `prestacao_final_2014.zip`); fica para uma change própria. Doação de empresa é proibida desde 2015, então 2018 em diante não tem empresas.
- Despesas de campanha.
- Qualquer busca por doador.

## Capabilities

### New Capabilities
- `receitas-de-campanha`: receitas agregadas das candidaturas do cadastro e a seção do perfil.

### Modified Capabilities
- `perfil-do-politico`: doadores saem da lista do que ainda não está no Cobra.

## Impact

- Migração `core.campaign_receipts`.
- `collectors`: job `receipts` no adaptador `tse`; modelo e testes.
- `web`: consulta e seção no perfil; seed e testes.
- Disco: cerca de 3,4 GB de arquivos brutos (2018 a 2024).
