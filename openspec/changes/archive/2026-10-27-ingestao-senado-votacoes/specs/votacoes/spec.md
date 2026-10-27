# Spec Delta

## MODIFIED Requirements

### Requirement: Votações do Plenário
A coleta SHALL guardar as votações do Plenário da Câmara e do Senado desde 2023 com data, descrição, resultado, contagem de votos e proposição, a partir dos dados abertos de cada casa, com fonte e data de coleta.

#### Scenario: Votação de comissão
- **WHEN** o arquivo traz uma votação da CCJC
- **THEN** ela não é guardada

#### Scenario: Votação do Senado
- **WHEN** o Senado aprova um projeto em votação nominal no Plenário
- **THEN** a votação fica guardada com a casa Senado, a proposição e os votos dos senadores

### Requirement: Como votou no perfil
O perfil de deputado federal e de senador SHALL mostrar as votações nominais mais recentes do Plenário em que ele tem voto registrado, com data, proposição, resultado e o voto ou o motivo da ausência como a casa informa, com link oficial, fonte e data de coleta, sem índice de alinhamento nem contagem de votos a favor ou contra o governo.

#### Scenario: Voto recente
- **WHEN** a deputada votou "Não" numa votação de 10/06/2026
- **THEN** o perfil mostra a data, a proposição, o resultado e "Não"

#### Scenario: Senador de licença
- **WHEN** o Senado registra o senador como "LS" numa votação nominal
- **THEN** o perfil mostra "Ausente: Licença saúde", como o Senado descreve, nessa votação

## ADDED Requirements

### Requirement: Votação secreta sem voto individual
Uma votação secreta do Senado SHALL ser guardada com os totais oficiais e SHALL não ter voto individual de nenhum senador, nem a indicação de quem votou.

#### Scenario: Autoridade em votação secreta
- **WHEN** o Senado aprova uma indicação de autoridade por 41 a 1 em votação secreta
- **THEN** a votação fica com 41 × 1 e nenhum senador tem voto nela

### Requirement: Ausências informadas pelo Senado
Em votação nominal do Senado, a coleta SHALL guardar também quem estava presente sem votar, quem presidia e quem estava ausente, com o motivo que o Senado informa (atividade parlamentar, missão, licença saúde, licença particular, não compareceu).

#### Scenario: Missão oficial
- **WHEN** o arquivo traz "MIS" para um senador
- **THEN** o voto dele fica como ausente, com o motivo "Missão da Casa no País/exterior", como o Senado descreve
