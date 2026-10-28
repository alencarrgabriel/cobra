# Spec Delta

## ADDED Requirements

### Requirement: Busca pelo nome do político
O campo de busca SHALL aceitar também o nome de um político e sugerir, a partir de 3 letras, até 8 políticos com nome, partido e UF, em ordem alfabética; a busca SHALL ler só o banco do Cobra e funcionar sem JavaScript.

#### Scenario: Nome único
- **WHEN** alguém busca um nome que corresponde a um só político
- **THEN** vai direto ao perfil dele

#### Scenario: Sugestões acessíveis
- **WHEN** alguém digita 3 letras ou mais de um nome
- **THEN** vê sugestões navegáveis pelo teclado e anunciadas por leitor de tela

### Requirement: Página de representantes sem lugar
`/representantes` sem lugar escolhido SHALL mostrar a busca, o mapa do Brasil e a lista de estados.

#### Scenario: Entrar sem lugar
- **WHEN** alguém abre `/representantes`
- **THEN** vê o mapa e a lista de estados, além da busca

### Requirement: Caminho curto até o perfil
No card de representante, o nome SHALL ser um link direto para o perfil, e o painel do representante SHALL ter "Ver perfil completo" como ação principal.

#### Scenario: Nome no card
- **WHEN** alguém clica no nome de um representante no card
- **THEN** abre o perfil completo

### Requirement: Três níveis em "Me representa"
A página de representantes SHALL mostrar os níveis "na sua cidade", "no seu estado" e "em Brasília"; um nível sem cobertura SHALL aparecer com "—" e o que falta, em vez de sumir.

#### Scenario: Nível sem cobertura
- **WHEN** alguém vê os representantes de uma cidade e ainda não há prefeito nem vereadores coletados
- **THEN** o nível "na sua cidade" aparece com "—" e a explicação do que falta
