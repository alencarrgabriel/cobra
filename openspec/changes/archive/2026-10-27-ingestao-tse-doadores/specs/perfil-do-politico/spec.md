# Spec Delta

## MODIFIED Requirements

### Requirement: Dado ainda não coletado
Blocos que dependem de dados ainda não coletados (votos, projetos, presença e gastos da cota) SHALL aparecer com "—" e a explicação do motivo, nunca com zero.

#### Scenario: Gastos ainda não coletados
- **WHEN** o perfil é aberto antes da coleta de gastos
- **THEN** o bloco de gastos mostra "—" e diz que esse dado ainda não está no Cobra
