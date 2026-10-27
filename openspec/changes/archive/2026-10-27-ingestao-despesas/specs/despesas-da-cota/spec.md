# Spec Delta

## Purpose

Define como o Cobra coleta as despesas da cota parlamentar da Câmara e do Senado, sem guardar dados de pessoas físicas, e como o perfil mostra os gastos.

## ADDED Requirements

### Requirement: Despesas da cota por parlamentar
A coleta SHALL guardar as despesas da cota parlamentar dos deputados federais e senadores desde 2023, com ano, mês, tipo de despesa como a casa escreve, data, valor líquido como a fonte informa e o link do documento quando houver, ligadas ao cadastro pelo id da casa; despesas de lideranças SHALL ficar fora.

#### Scenario: Despesa de liderança
- **WHEN** o arquivo da Câmara traz uma despesa da "LIDERANÇA DO GOVERNO NA CÂMARA"
- **THEN** ela não é guardada

#### Scenario: Estorno
- **WHEN** a casa informa um valor líquido negativo
- **THEN** o valor é guardado negativo, como a fonte informa

### Requirement: Fornecedor pessoa física sem dados pessoais
Quando o fornecedor tem CPF, a coleta SHALL guardar só a indicação "pessoa física" e o valor, sem nome nem CPF; o nome do passageiro e o trecho de viagem SHALL nunca ser guardados. Fornecedor empresa SHALL ter nome e CNPJ.

#### Scenario: Motorista autônomo
- **WHEN** a despesa é paga a "JOÃO DE TAL", CPF 123.456.789-01
- **THEN** o Cobra guarda "pessoa física" e o valor, e nenhuma tabela recebe o nome ou o CPF

#### Scenario: Passagem aérea
- **WHEN** a despesa de passagem traz o nome do passageiro e o trecho
- **THEN** nenhum dos dois é guardado

### Requirement: Gastos no perfil
O perfil de deputado federal e de senador SHALL mostrar, para os três anos mais recentes com despesa, o total e o valor por tipo de despesa, com link para a página oficial de gastos, fonte e data de coleta, sem comparação com outros parlamentares nem com médias.

#### Scenario: Ano corrente
- **WHEN** o deputado gastou R$ 30.000 em combustíveis e R$ 10.000 em divulgação em 2026
- **THEN** o perfil mostra 2026 com total de R$ 40 mil e os dois tipos com seus valores
