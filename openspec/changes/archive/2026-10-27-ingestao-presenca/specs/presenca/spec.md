# Spec Delta

## Purpose

Define como o Cobra mostra a presença dos parlamentares: na Câmara, a presença registrada nas sessões deliberativas do Plenário; no Senado, o comparecimento às votações nominais; sempre com a mediana da casa como referência e sem ranking.

## ADDED Requirements

### Requirement: Presença nas sessões da Câmara
A coleta SHALL guardar as sessões deliberativas encerradas do Plenário da Câmara desde 2023 e os deputados com presença registrada em cada uma, a partir dos arquivos anuais de dados abertos; sessões solenes, canceladas e de comissões SHALL ficar fora.

#### Scenario: Sessão solene
- **WHEN** o arquivo traz uma sessão não deliberativa solene do Plenário
- **THEN** ela não entra na presença

### Requirement: Comparecimento às votações do Senado
Para senadores, o Cobra SHALL mostrar o comparecimento às votações nominais do Plenário, calculado a partir dos votos coletados, com as ausências por motivo como o Senado informa, e SHALL não chamar isso de presença em sessão.

#### Scenario: Senador com licença
- **WHEN** o senador votou em 40 de 50 votações nominais e estava de licença saúde em 10
- **THEN** o perfil mostra "Compareceu a 40 de 50 votações nominais do Plenário" e "Licença saúde: 10"

### Requirement: Presença no perfil com a mediana da casa
O perfil SHALL mostrar a presença por ano desde 2023, com as contagens absolutas, a porcentagem e a mediana dos parlamentares da mesma casa no mesmo ano como referência, com fonte e data de coleta, sem posição em ranking.

#### Scenario: Deputado em 2025
- **WHEN** o deputado esteve presente em 110 das 121 sessões deliberativas de 2025 e a mediana da Câmara foi 92%
- **THEN** o perfil mostra "Presente em 110 de 121 sessões deliberativas do Plenário (91%)" e "Mediana dos deputados: 92%"

#### Scenario: Licença na Câmara
- **WHEN** a seção da Câmara é exibida
- **THEN** ela avisa que períodos de licença não são descontados
