# Spec Delta

## ADDED Requirements

### Requirement: Titular licenciado no cadastro
Um titular que está na lista de afastados por afastamento temporário (licença, cargo de ministro ou secretário) e ainda não está no cadastro SHALL ser cadastrado com mandato aberto em situação licenciado, porque continua titular do mandato e pode ser autor de emendas. Ele SHALL não contar na bancada em exercício.

#### Scenario: Senadora licenciada
- **WHEN** a lista de afastados traz uma titular licenciada que não estava no cadastro
- **THEN** ela passa a existir no cadastro com mandato aberto em situação licenciado e fica fora da bancada em exercício da UF
