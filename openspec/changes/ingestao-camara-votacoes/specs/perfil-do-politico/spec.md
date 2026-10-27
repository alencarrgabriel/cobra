# Spec Delta

## MODIFIED Requirements

### Requirement: Dado ainda não coletado
Blocos que dependem de dados ainda não coletados (votos de senadores, projetos, presença e gastos da cota) SHALL aparecer com "—" e a explicação do motivo, nunca com zero.

#### Scenario: Gastos ainda não coletados
- **WHEN** o perfil é aberto antes da coleta de gastos
- **THEN** o bloco de gastos mostra "—" e diz que esse dado ainda não está no Cobra

#### Scenario: Votos de senador
- **WHEN** o perfil de um senador é aberto antes da coleta das votações do Senado
- **THEN** o bloco "Como votou" mostra "—" e diz que vem com a coleta das votações do Senado
