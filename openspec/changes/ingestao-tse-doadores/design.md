# Design

## Context

Catálogo `dadosabertos.tse.jus.br` (conferido em 2026-10-27): de 2018 a 2024, `prestacao_contas/prestacao_de_contas_eleitorais_candidatos_<ano>.zip` (2018: 304 MB; 2020: 1,26 GB; 2022: 462 MB; 2024: 1,34 GB). Dentro, `receitas_candidatos_<ano>_<UF>.csv`, `_BR.csv` (presidente) e `_BRASIL.csv`, cuja contagem de linhas é a soma das UFs (2018: 329.683 linhas nos dois). Colunas usadas: `AA_ELEICAO`, `CD_TIPO_ELEICAO`, `NM_TIPO_ELEICAO`, `SQ_CANDIDATO`, `CD_ORIGEM_RECEITA`, `CD_FONTE_RECEITA`, `NR_CPF_CNPJ_DOADOR`, `NM_DOADOR_RFB`, `VR_RECEITA`. O arquivo também traz endereço, CNAE, município, gênero e cor ou raça do doador, que não são lidos.

Origens (`CD_ORIGEM_RECEITA`): 10010100 recursos próprios; 10010200 pessoas físicas; 10010400 doações pela internet; 10020000 partido político; 10020500 financiamento coletivo; 10030100 eventos; 10030200 rendimentos; 10030300 origem não identificada; 10040000 outros candidatos; -1 nulo. Fontes (`CD_FONTE_RECEITA`): 0 Fundo Partidário; 1 outros recursos; 2 Fundo Especial.

## Goals / Non-Goals

**Goals:** de onde veio o dinheiro de cada campanha, sem expor cidadãos.

**Non-Goals:** lista de pessoas físicas, CPF/CNPJ, despesas, anos antes de 2018.

## Decisions

### D1. Arquivo lido
- Só `receitas_candidatos_<ano>_BRASIL.csv`; os das UFs repetem as mesmas linhas.
- Download em streaming (`Context.fetch_file`), leitura linha a linha.

### D2. Agregação (decisão de 2026-10-27)
- Chave: candidatura (`SQ_CANDIDATO`, ano), origem (slug), fonte (slug) e, só para origem `partidos`, o nome do doador (`NM_DOADOR_RFB`).
- Por chave: quantidade de receitas e total; para `pessoas_fisicas`, também a quantidade de doadores distintos, contada pelo CPF **só em memória durante a leitura**.
- Slugs de origem: `proprios`, `pessoas_fisicas` (10010200 e 10010400), `partidos`, `financiamento_coletivo`, `outros_candidatos`, `outras` (eventos, rendimentos, não identificada, nulo).
- Slugs de fonte: `fefc` (2), `fundo_partidario` (0), `outros` (1 e nulo).
- Valor com vírgula decimal, como a fonte informa.
- Alternativa considerada: guardar cada receita sem CPF. Rejeitada: o nome da pessoa física continuaria guardado.

### D3. Tabela `core.campaign_receipts`
- `politician_id`, `election_year`, `tse_candidate_id`, `origin`, `fund`, `donor_name` (só partidos), `receipts`, `donors` (só pessoas físicas), `total`. Proveniência; `source_id = <ano>-<SQ>-<origem>-<fonte>-<n>`.
- O job apaga as linhas do ano e grava de novo na mesma transação.
- Validação: em 2018 e 2022, receitas de ao menos 300 candidaturas do cadastro.

### D4. Perfil
- "Receitas de campanha", por eleição (mais recente primeiro): total; uma linha por origem com o valor e a parte do total; Fundo Especial e Fundo Partidário; "N pessoas físicas doaram R$ X"; partidos doadores em ordem alfabética com o valor.
- Textos fixos: "Valores informados pelo candidato ao TSE, incluindo doações estimáveis em dinheiro (bens e serviços)." e "Doadores pessoas físicas aparecem só somados."
- Sem ranking entre políticos.

### D5. Testes
- Modelo: origens e fontes, agregação, contagem de doadores sem guardar CPF, nome só de partido.
- Banco: job grava só candidaturas do cadastro e nenhum CPF, nome de pessoa física ou endereço.
- Site: seção com seed (Playwright).
