# Spec Delta

## Purpose

Define como o Cobra coleta do TSE os bens declarados pelas candidaturas dos políticos do cadastro, sem a descrição dos bens, e como o perfil mostra o total, a composição e a variação entre declarações.

## ADDED Requirements

### Requirement: Bens sem descrição
A coleta SHALL guardar, de cada bem declarado por uma candidatura do cadastro, só o tipo e o valor, e SHALL não guardar a descrição do bem, que traz endereços e detalhes da vida privada.

#### Scenario: Descrição com endereço
- **WHEN** o arquivo do TSE descreve um bem como "CASA NA QL 14 CONJUNTO 5"
- **THEN** o Cobra guarda o tipo "Casa" e o valor, e nenhuma tabela recebe esse texto

#### Scenario: Candidato fora do cadastro
- **WHEN** o arquivo traz bens de um candidato que não está no cadastro
- **THEN** nada desses bens é guardado

### Requirement: Composição por tipo de bem
Cada bem SHALL receber uma categoria (imóveis, veículos, dinheiro e aplicações, outros) por uma tabela fixa de códigos de tipo, a mesma para todos os anos e políticos.

#### Scenario: Apartamento e automóvel
- **WHEN** a declaração tem um bem de código 11 (apartamento) e um de código 21 (veículo)
- **THEN** o primeiro é imóvel e o segundo é veículo

### Requirement: Patrimônio no perfil
O perfil SHALL mostrar, por eleição com declaração, o total, a composição por categoria e a variação em relação à declaração anterior, em reais e em porcentagem, com a fonte, a data de coleta e o aviso de que os valores são os declarados pelo candidato, sem correção pela inflação. A declaração mais antiga SHALL mostrar a variação como "—".

#### Scenario: Duas declarações
- **WHEN** o político declarou R$ 1.000.000 em 2018 e R$ 1.500.000 em 2022
- **THEN** a linha de 2022 mostra a variação de R$ 500 mil (+50%) e a de 2018 mostra "—"

#### Scenario: Sem correção pela inflação
- **WHEN** a seção é exibida
- **THEN** ela diz que os valores não têm correção pela inflação
