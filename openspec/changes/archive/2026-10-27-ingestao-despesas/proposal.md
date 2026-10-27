# Ingestão de despesas da cota parlamentar

## Why

O perfil mostra "Gastos da cota parlamentar — ainda não está no Cobra" (DDR §6, entidade Despesa; RF-33). A change 21 do plano (`ingestao-despesas-presenca`) foi dividida: esta traz os gastos da cota da Câmara (CEAP) e do Senado (CEAPS); a presença vem em `ingestao-presenca`.

## What Changes

- **Fontes** (conferidas em 2026-10-27):
  - Câmara: `https://www.camara.leg.br/cotas/Ano-<ano>.csv.zip` (um CSV por ano, UTF-8, `;`; 2026: 118.851 linhas);
  - Senado: `https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/<ano>` (JSON com o código do senador; 2026: 15.933 itens).
- **De 2023 ao ano corrente**, só despesas de parlamentares (lideranças ficam fora), ligadas ao cadastro pelo id da casa.
- **Coleta mínima (mesma linha da decisão sobre doadores de 2026-10-27):**
  - fornecedor empresa: nome e CNPJ;
  - fornecedor pessoa física: nem nome nem CPF; só a indicação "pessoa física" e o valor;
  - nome do passageiro e trecho da viagem nunca são guardados;
  - fica o link do documento fiscal publicado pela Câmara.
- **Perfil:** "Gastos da cota parlamentar" por ano (até três anos): total e valor por tipo de despesa, como a casa nomeia, com link para a página oficial de gastos e a fonte. Sem comparação com outros parlamentares nem com médias.

## Fora de escopo

- Limite mensal da cota por UF (RF-33, "gastos com o limite da cota"): exige a tabela do Ato da Mesa, numa change própria.
- Eventos de gasto acima da média do próprio parlamentar (RF-16, fase 2).
- Busca por fornecedor.

## Capabilities

### New Capabilities
- `despesas-da-cota`: despesas da cota parlamentar da Câmara e do Senado e a seção do perfil.

### Modified Capabilities
- `perfil-do-politico`: gastos da cota saem da lista do que ainda não está no Cobra.

## Impact

- Migração `core.expenses`.
- `collectors`: job `expenses` nos adaptadores `camara` e `senado`; modelos e testes.
- `web`: consulta e seção no perfil; seed e testes.
