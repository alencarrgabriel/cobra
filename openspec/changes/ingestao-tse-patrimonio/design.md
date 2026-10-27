# Design

## Context

`bem_candidato_<ano>.zip` (cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/, conferido em 2026-10-27): 404 de 1994 a 2004; de 2006 a 2024, um CSV por UF, latin-1, `;`, com `ANO_ELEICAO`, `CD_TIPO_ELEICAO`, `NM_TIPO_ELEICAO`, `SQ_CANDIDATO`, a ordem do bem (`NR_ORDEM_CANDIDATO` em 2006, `NR_ORDEM_BEM_CANDIDATO` depois), `CD_TIPO_BEM_CANDIDATO`, `DS_TIPO_BEM_CANDIDATO`, `DS_BEM_CANDIDATO` e `VR_BEM_CANDIDATO` (vírgula decimal). Os códigos de tipo (51 em 2020 e 2022) seguem a tabela da declaração de bens da Receita: 1 a 19 imóveis, 21 a 29 bens móveis, 31 a 39 participações, 41 a 49 aplicações, 51 a 59 créditos, 61 a 69 depósitos e dinheiro, 71 a 79 fundos, 91 a 99 outros. Em 2006 só aparece o código 99. Parte dos nomes de tipo vem com codificação misturada.

## Goals / Non-Goals

**Goals:** total e composição por eleição, variação entre declarações, sem descrição do bem.

**Non-Goals:** lista de bens com descrição, correção monetária, comparação entre políticos.

## Decisions

### D1. O que se guarda
- `core.declared_assets`: `politician_id`, `election_year`, `tse_candidate_id`, `item_order`, `type_code`, `type_label`, `category`, `value`. Proveniência; `source_id = <ano>-<SQ_CANDIDATO>-<ordem>`.
- `DS_BEM_CANDIDATO` não é lido.
- `type_label` vem de uma tabela fixa por código no coletor (nomes escritos corretamente); código desconhecido usa o nome do arquivo.

### D2. Categorias (tabela fixa)
- `imoveis`: 1 a 19; `veiculos`: 21 a 23; `dinheiro` (dinheiro e aplicações): 41 a 49 e 61 a 79; `outros`: o resto (bens móveis 24 a 29, participações, créditos, 91 a 99).
- Alternativa: categorias pelo nome do tipo. Rejeitada: o nome muda de grafia e de codificação entre anos.

### D3. Job `assets`
- Um por ano, de 2006 a 2024, no plano do adaptador `tse`.
- Lê só as candidaturas já guardadas daquele ano (`tse_candidate_id`); apaga os bens do ano e grava de novo, na mesma transação.
- Valor: vírgula decimal; guardado como a fonte informa, inclusive os poucos registros negativos do TSE (um em 2020); valor ilegível falha o job.
- Validação: em 2018 e 2022, bens de ao menos 300 candidaturas do cadastro.
- Ordem: só depois das candidaturas do ano; se não houver candidaturas, o job não grava nada.

### D4. Perfil
- "Patrimônio declarado": uma linha por eleição com declaração, da mais recente para a mais antiga: ano, cargo, total, imóveis, veículos, dinheiro e aplicações, outros e a variação.
- Variação: diferença para a declaração anterior do mesmo político, em reais e em porcentagem quando a anterior é maior que zero; a mais antiga mostra "—".
- Candidatura sem nenhum bem no arquivo: "Nenhum bem declarado ao TSE" para aquela eleição (fica só quando o ano tem arquivo de bens).
- Textos fixos: "Valores declarados pelo candidato ao TSE, sem correção pela inflação." e, se houver 2006, "Em 2006 o TSE não informa o tipo dos bens: todos aparecem em Outros."
- Números em formato compacto (R$ 1,2 mi), sem ranking nem comparação com outros políticos.

### D5. Testes
- Modelo: categorias por código, valor com vírgula, ordem de 2006 e de 2022, descrição ignorada.
- Banco: job grava só candidaturas do cadastro, sem descrição; regrava sem duplicar.
- Site: cálculo da variação (Vitest); seção com seed (Playwright).
