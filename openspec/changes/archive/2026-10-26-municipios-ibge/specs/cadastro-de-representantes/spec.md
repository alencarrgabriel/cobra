# Spec Delta

## ADDED Requirements

### Requirement: Municípios disponíveis
O banco SHALL conter todos os municípios informados pelo IBGE, cada um identificado pelo código IBGE de 7 dígitos, com nome, UF e um nome de busca sem acentos e em minúsculas.

#### Scenario: Brasília
- **WHEN** a localidade de código `5300108` é consultada
- **THEN** ela é um município chamado Brasília, da UF `53`, com nome de busca `brasilia`

#### Scenario: Busca sem acento
- **WHEN** se procura o município de nome de busca `sao paulo`
- **THEN** o resultado é São Paulo, código `3550308`, da UF `35`

#### Scenario: Total
- **WHEN** os municípios são contados depois da coleta
- **THEN** o total é igual ao informado pela API do IBGE
