# Spec Delta

## MODIFIED Requirements

### Requirement: Mapa com pinos por situação
A página SHALL mostrar um mapa interativo do lugar, com ruas e nomes de lugares em português, zoom e arrasto, e um pino por obra que tenha localização, colorido pela situação. Pinos próximos SHALL se agrupar mostrando quantas obras reúnem, e se separar ao aproximar o zoom. Ao tocar num pino, o cidadão SHALL ver um resumo da obra com link para a ficha. Obras sem localização SHALL ser contadas e informadas, nunca posicionadas em lugar inventado. O mapa SHALL ser servido pelo próprio Cobra, sem carregar conteúdo de terceiros nem exigir chave de API, e SHALL mostrar o crédito dos dados do mapa. Sem JavaScript, a página SHALL continuar mostrando a lista e a contagem das obras.

#### Scenario: Obra sem localização
- **WHEN** há obras filtradas sem coordenadas
- **THEN** o mapa informa quantas obras não aparecem nele por falta de localização, e elas continuam na lista

#### Scenario: Resumo ao tocar no pino
- **WHEN** o cidadão toca no pino de uma obra
- **THEN** vê o nome, a situação e o valor previsto da obra e um link para a ficha

#### Scenario: Pinos agrupados
- **WHEN** o mapa mostra o DF inteiro
- **THEN** pinos próximos aparecem agrupados com o número de obras, e ao aproximar o zoom se separam

#### Scenario: Filtro vale para o mapa
- **WHEN** o cidadão filtra por situação "Paralisada"
- **THEN** o mapa mostra só os pinos das obras paralisadas

#### Scenario: Sem terceiros
- **WHEN** a página de obras carrega o mapa
- **THEN** o navegador só faz requisições ao próprio site do Cobra

## ADDED Requirements

### Requirement: Abrir a obra num mapa externo
A ficha de cada obra com localização SHALL oferecer links para ver o local no Google Maps, traçar a rota até ele e abrir o Street View. Os links SHALL abrir o Google Maps só quando o cidadão clicar, e a ficha SHALL avisar que o link leva a um serviço externo. Obras sem localização SHALL não mostrar esses links.

#### Scenario: Obra com localização
- **WHEN** o cidadão abre a ficha de uma obra com coordenadas
- **THEN** vê os links "Ver no Google Maps", "Como chegar" e "Street View", que apontam para as coordenadas da obra

#### Scenario: Obra sem localização
- **WHEN** o cidadão abre a ficha de uma obra sem coordenadas
- **THEN** não vê os links de mapa externo e lê que a fonte não informa a localização
