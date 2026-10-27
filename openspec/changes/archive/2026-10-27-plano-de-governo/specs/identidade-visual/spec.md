# Spec Delta

## MODIFIED Requirements

### Requirement: Navegação no computador e no celular
Em telas largas o site SHALL mostrar as seções numa barra superior; em telas de celular SHALL mostrar uma barra inferior fixa com Início, Representantes, Votações, Obras e Planos. Seções ainda não disponíveis SHALL aparecer marcadas como "em breve" e não SHALL levar a página vazia.

#### Scenario: Celular
- **WHEN** o site é aberto numa tela de 360 px de largura
- **THEN** a barra inferior com as cinco seções está visível, cabe na largura e não cobre o conteúdo final da página

#### Scenario: Seção ainda não entregue
- **WHEN** o usuário vê uma seção que ainda não existe
- **THEN** ela aparece com o selo "em breve" e não é um link ativo
