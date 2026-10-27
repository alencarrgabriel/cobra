# Spec Delta

## MODIFIED Requirements

### Requirement: Card de representante
Cada representante SHALL aparecer num card com foto oficial, nome, bandeira da UF e o selo do partido (sigla e cor), igual para todos os partidos. Tocar no card SHALL abrir um painel com o resumo: cargo, situação, desde quando está em exercício, partido, link para a fonte oficial e link para o perfil completo no Cobra.

#### Scenario: Abrir o resumo
- **WHEN** o cidadão toca no card de uma senadora
- **THEN** abre o painel com o cargo, o partido, a situação, a data de início do mandato e o link para a página dela no Senado

#### Scenario: Ir para o perfil
- **WHEN** o cidadão escolhe "Ver perfil completo" no painel
- **THEN** ele vai para o perfil do político no Cobra
