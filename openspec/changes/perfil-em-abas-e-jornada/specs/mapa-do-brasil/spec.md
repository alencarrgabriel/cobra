# Spec Delta

## ADDED Requirements

### Requirement: Bandeira no estado ativo
O estado sob o ponteiro, com foco ou selecionado SHALL mostrar a bandeira dele recortada no contorno; os demais estados SHALL continuar com o preenchimento neutro; a transição SHALL respeitar a preferência por menos movimento.

#### Scenario: Passar o ponteiro
- **WHEN** alguém passa o ponteiro ou o foco do teclado sobre um estado
- **THEN** a bandeira desse estado aparece no contorno dele e os demais continuam neutros
