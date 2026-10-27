# Spec Delta

## ADDED Requirements

### Requirement: Foto oficial em endereço seguro
A foto oficial de cada senador SHALL ser guardada no endereço `https://legis.senado.leg.br/senadores/fotos-oficiais/<código>`, para onde o endereço informado na lista do Senado redireciona, de modo que o site possa servi-la sem conexão insegura.

#### Scenario: Foto da senadora do DF
- **WHEN** a senadora de código 6335 é coletada
- **THEN** a foto dela fica em `https://legis.senado.leg.br/senadores/fotos-oficiais/6335`
