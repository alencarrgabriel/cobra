# Spec Delta

## ADDED Requirements

### Requirement: Botão Seguir
Todo perfil SHALL ter um botão "Seguir" que leva ao cadastro de alertas com o político escolhido; o site SHALL não guardar no navegador quem a pessoa segue.

#### Scenario: Seguir a partir do perfil
- **WHEN** alguém clica em "Seguir" no perfil de um político
- **THEN** abre o cadastro de alertas mostrando esse político e pedindo o consentimento específico para guardar seguidos
