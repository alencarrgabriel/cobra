# Spec Delta

## ADDED Requirements

### Requirement: Empenhos de cada obra
A coleta do Obrasgov SHALL guardar os empenhos de cada obra do DF, com número do empenho, data de emissão, valor, resultado primário e o campo que identifica a emenda parlamentar, como informado pela fonte.

#### Scenario: Empenho pago por emenda
- **WHEN** o Obrasgov informa um empenho de uma obra com o identificador da emenda preenchido
- **THEN** o empenho fica guardado ligado à obra, com o identificador como veio e a emenda reconhecida a partir dele

#### Scenario: Empenho sem emenda
- **WHEN** o Obrasgov informa um empenho com o identificador da emenda igual a "0" ou vazio
- **THEN** o empenho fica guardado sem emenda reconhecida
