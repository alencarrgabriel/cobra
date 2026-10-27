# Ingestão do TSE: patrimônio declarado

## Why

O DDR pede o patrimônio declarado em cada eleição (RF-26) com a composição por tipo de bem (imóveis, veículos, dinheiro, outros) e a variação entre declarações (RF-37). As candidaturas dos políticos do cadastro já estão no Cobra (change `ingestao-tse-candidaturas`); falta a declaração de bens de cada uma.

## What Changes

- **Fonte:** `bem_candidato_<ano>.zip` do TSE, de 2006 a 2024 (de 2 a 82 MB; antes de 2006 o arquivo não existe, conferido em 2026-10-27).
- **Coleta mínima:** de cada bem ficam só o tipo (código e nome) e o valor. A **descrição do bem não é guardada**: ela traz endereços e detalhes da vida privada (o DDR proíbe publicar endereço de político).
- **Só candidaturas já ligadas ao cadastro** (mesmo `SQ_CANDIDATO` e ano).
- **Categoria por código do tipo**, numa tabela fixa: imóveis, veículos, dinheiro e aplicações, outros. Em 2006 o TSE informa todos os bens como "Outros bens e direitos" (código 99); o perfil diz isso.
- **Perfil:** seção "Patrimônio declarado" com, por eleição, o total, a composição por categoria e a variação em relação à declaração anterior, em reais e em porcentagem, com o aviso de que os valores são os declarados pelo candidato, sem correção pela inflação. Sai "Patrimônio" da lista "Ainda não está no Cobra" (doadores continuam lá).

## Fora de escopo

- Doadores (RF-26, parte de receitas): change `ingestao-tse-doadores`.
- Correção monetária dos valores.
- Patrimônio antes de 2006 (o TSE não publica o arquivo).

## Capabilities

### New Capabilities
- `patrimonio-declarado`: bens declarados ao TSE pelas candidaturas do cadastro e a seção do perfil.

### Modified Capabilities
- `perfil-do-politico`: patrimônio sai da lista do que ainda não está no Cobra.

## Impact

- Migração `core.declared_assets`.
- `collectors`: job `assets` no adaptador `tse`, modelo e testes.
- `web`: consulta, cálculo da variação e seção no perfil; seed e testes.
