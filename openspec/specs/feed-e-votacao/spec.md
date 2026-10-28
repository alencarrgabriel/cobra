# feed-e-votacao Specification

## Purpose
Define o feed "O que aconteceu" e a página de cada votação: o que aparece, em que ordem, como os votos dos representantes do lugar são mostrados e como votações simbólicas e secretas são tratadas, sempre com fonte e data e sem juízo de valor.

## Requirements

### Requirement: Feed de eventos
O site SHALL ter um feed com as votações relevantes e as votações simbólicas das duas casas, da mais recente para a mais antiga, cada uma com data, casa, proposição, resultado, contagem, o critério de relevância em palavras, a fonte e o resumo aprovado quando houver; a votação simbólica SHALL aparecer como evento da proposição, sem voto individual.

#### Scenario: Votação relevante
- **WHEN** o feed é aberto
- **THEN** a votação relevante mais recente aparece primeiro, com o critério que a tornou relevante

#### Scenario: Votação simbólica
- **WHEN** uma votação simbólica de uma proposição está no feed
- **THEN** ela aparece sem voto de nenhum parlamentar e com a explicação de que foi simbólica

### Requirement: Votos dos representantes do lugar
Com um lugar escolhido, cada votação relevante do feed SHALL mostrar o voto de cada representante daquele lugar que tinha mandato na data, em ordem alfabética; na Câmara, deputado em exercício sem voto registrado SHALL aparecer como "Não registrou voto"; no Senado, a ausência SHALL vir com o motivo que o Senado informa. O endereço SHALL usar o código IBGE, nunca o CEP.

#### Scenario: Deputado sem voto
- **WHEN** um deputado do DF estava em exercício e não tem voto registrado na votação
- **THEN** o feed do DF mostra o nome dele com "Não registrou voto"

### Requirement: Página da votação
Cada votação SHALL ter página permanente com proposição, ementa e link oficial, data, casa, resultado, contagem oficial, critérios de relevância, orientações das lideranças, placar por partido e por UF em ordem alfabética e a lista de votos em ordem alfabética; votações simbólicas e secretas SHALL mostrar só a contagem, com a explicação. Endereço inexistente SHALL responder 404.

#### Scenario: Placar por partido
- **WHEN** a página de uma votação nominal é aberta
- **THEN** ela mostra, para cada partido em ordem alfabética, quantos votaram sim, não e outros

#### Scenario: Votação secreta
- **WHEN** a página de uma votação secreta do Senado é aberta
- **THEN** ela mostra só a contagem oficial e explica que o voto foi secreto

### Requirement: Só resumo revisado
A página e o feed SHALL mostrar apenas resumos aprovados no painel editorial, com "revisado por pessoas" e a indicação de IA quando houver; sem resumo aprovado, a página SHALL dizer que o resumo ainda não foi revisado.

#### Scenario: Sem resumo aprovado
- **WHEN** a votação só tem rascunho
- **THEN** a página diz "O resumo desta votação ainda não foi revisado pela equipe" e não mostra o rascunho
