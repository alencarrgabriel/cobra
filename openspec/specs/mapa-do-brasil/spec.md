# mapa-do-brasil Specification

## Purpose
Define o mapa do Brasil da página inicial e os exemplos de cards mostrados antes de pedir o CEP, com a mesma aparência para todos os estados e escolha objetiva dos exemplos.

## Requirements

### Requirement: Mapa do Brasil clicável
A página inicial SHALL mostrar o mapa do Brasil desenhado a partir da malha oficial do IBGE, com fonte e data, em que cada uma das 27 UFs leva à bancada daquele estado. O mapa SHALL funcionar sem JavaScript e SHALL ter, ao lado, a lista das 27 UFs em ordem alfabética com os mesmos links.

#### Scenario: Tocar no DF
- **WHEN** a pessoa toca no Distrito Federal no mapa ou na lista
- **THEN** abre a página dos representantes do Distrito Federal

#### Scenario: Sem JavaScript
- **WHEN** a página inicial é carregada sem JavaScript
- **THEN** o HTML já traz os 27 links do mapa

### Requirement: Mapa neutro
Todos os estados SHALL ter a mesma cor no mapa; o mapa SHALL não colorir estados por partido, por quantidade ou por qualquer outro dado.

#### Scenario: Cores iguais
- **WHEN** o mapa é exibido
- **THEN** os 27 estados têm o mesmo preenchimento, e só o estado sob o ponteiro ou com foco muda de cor

### Requirement: Exemplos de cards antes do CEP
A página inicial SHALL mostrar exemplos de cards de compartilhar escolhidos por regra objetiva e escrita na tela, sem escolher um político: o card dos representantes do DF e o card da obra do DF com a atualização mais recente no Obrasgov.br.

#### Scenario: Exemplos
- **WHEN** alguém abre a página inicial
- **THEN** vê o card dos representantes do DF e o de uma obra, com a legenda que explica a escolha
