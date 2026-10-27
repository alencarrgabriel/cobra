# votacoes Specification

## Purpose
Define como o Cobra coleta as votações do Plenário da Câmara, os votos de cada deputado e as orientações das lideranças, separando votações nominais de simbólicas, e como o perfil mostra os votos recentes.

## Requirements

### Requirement: Votações do Plenário
A coleta SHALL guardar as votações do Plenário da Câmara desde 2023 com data, descrição, resultado, contagem de votos e proposição, a partir dos arquivos anuais de dados abertos, com fonte e data de coleta.

#### Scenario: Votação de comissão
- **WHEN** o arquivo traz uma votação da CCJC
- **THEN** ela não é guardada

### Requirement: Votação simbólica sem voto individual
Uma votação sem votos individuais no arquivo SHALL ser guardada como simbólica e SHALL não ter voto atribuído a nenhum deputado.

#### Scenario: Aprovação simbólica
- **WHEN** o Plenário aprova um requerimento sem registro nominal
- **THEN** a votação aparece como simbólica e nenhum deputado tem voto nela

### Requirement: Voto de cada deputado
Em votação nominal, a coleta SHALL guardar o voto de cada deputado (sim, não, abstenção, obstrução, art. 17 ou não informado) com o partido e a UF na data, inclusive de deputados fora do cadastro, ligando ao político do cadastro pelo id da Câmara quando houver.

#### Scenario: Deputado fora do cadastro
- **WHEN** um suplente que já deixou o mandato votou em 2023
- **THEN** o voto é guardado com nome, partido e UF, sem ligação a político do cadastro, e entra no placar

### Requirement: Contagem conferida
Antes de publicar, a coleta SHALL conferir que, em cada votação nominal, os votos individuais "sim" e "não" somam o mesmo que a contagem oficial. Uma votação que não confere SHALL ficar com a contagem oficial, sem votos individuais publicados e com uma nota de qualidade; se mais de 5% das votações nominais do ano não conferirem, nada do ano SHALL ser publicado.

#### Scenario: Uma votação divergente
- **WHEN** o arquivo de votações diz 404 "sim" e 61 "não" e os votos individuais da votação vêm em branco
- **THEN** a votação fica com 404 × 61, sem votos individuais, e com a nota "votos individuais não conferem com o placar oficial"

#### Scenario: Arquivo quebrado
- **WHEN** a maioria das votações nominais do ano não confere
- **THEN** o job falha e as votações do ano não são atualizadas

### Requirement: Orientação das lideranças
A coleta SHALL guardar a orientação de cada liderança e bancada em cada votação, como a Câmara informa.

#### Scenario: Governo e Oposição
- **WHEN** o Governo orienta "Sim" e a Oposição orienta "Não"
- **THEN** as duas orientações ficam guardadas na votação

### Requirement: Como votou no perfil
O perfil de deputado federal SHALL mostrar as votações nominais mais recentes do Plenário em que ele votou, com data, proposição, resultado e o voto, com link oficial, fonte e data de coleta, sem índice de alinhamento nem contagem de votos a favor ou contra o governo.

#### Scenario: Voto recente
- **WHEN** a deputada votou "Não" numa votação de 10/06/2026
- **THEN** o perfil mostra a data, a proposição, o resultado e "Não"
