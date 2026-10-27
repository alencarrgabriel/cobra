# trajetoria-eleitoral Specification

## Purpose
Define como o Cobra coleta do TSE as candidaturas e os votos dos políticos do cadastro, de 1994 a 2024, com coleta mínima, e como o perfil mostra a trajetória eleitoral.

## Requirements

### Requirement: Candidaturas ligadas ao cadastro
A coleta SHALL guardar as candidaturas em eleições ordinárias de 1994 a 2024 só de políticos do cadastro, ligadas pelo CPF quando o Cobra o conhece ou pelo nome civil e data de nascimento iguais a exatamente um político; um CPF diferente do conhecido SHALL impedir a ligação. Cada candidatura SHALL registrar a regra usada.

#### Scenario: Ligação por nome e nascimento
- **WHEN** o arquivo de 1994 traz uma candidatura sem CPF com o mesmo nome civil e data de nascimento de um único político do cadastro
- **THEN** a candidatura é guardada ligada a esse político, com a regra "nome-e-nascimento"

#### Scenario: Homônimo
- **WHEN** nome e data de nascimento batem com dois políticos do cadastro
- **THEN** a candidatura não é guardada

#### Scenario: Candidato fora do cadastro
- **WHEN** o arquivo traz um candidato que não está no cadastro
- **THEN** nada dele é guardado

### Requirement: Coleta mínima do TSE
A coleta SHALL guardar só ano, turno, cargo, local, partido, nome de urna, número, situação, resultado e votos, e SHALL não guardar CPF, e-mail, título de eleitor, gênero, cor ou raça, estado civil nem grau de instrução dos arquivos do TSE.

#### Scenario: Sem dados pessoais
- **WHEN** as candidaturas de um ano são guardadas
- **THEN** nenhuma tabela recebe o e-mail, o título de eleitor ou a cor ou raça do candidato

### Requirement: Votos por turno
A coleta SHALL somar os votos nominais do candidato em todas as zonas, separadamente por turno, e SHALL deixar o voto vazio, nunca zero, quando o arquivo de votos não traz a candidatura.

#### Scenario: Dois turnos
- **WHEN** um candidato a governador disputa os dois turnos
- **THEN** há uma linha por turno, cada uma com a soma dos votos daquele turno

### Requirement: Arquivo grande sem estourar a memória
O coletor SHALL baixar arquivos grandes direto para o disco, em pedaços, registrando caminho, tamanho e SHA-256 calculado durante a cópia.

#### Scenario: Arquivo de votos de 2022
- **WHEN** o coletor baixa o arquivo de votos de 2022 (cerca de 565 MB)
- **THEN** o arquivo fica no diretório de dados brutos e o registro bruto tem o tamanho e o hash do arquivo

### Requirement: Trajetória no perfil
O perfil SHALL mostrar a trajetória eleitoral do mais recente ao mais antigo, com ano, cargo, local, partido, votos e resultado como o TSE informa, e a sequência de partidos pelos quais o político disputou, com fonte e data de coleta, sem somar votos nem contar vitórias.

#### Scenario: Deputada reeleita
- **WHEN** o perfil é de alguém eleito deputado federal em 2018 e 2022
- **THEN** a trajetória mostra 2022 antes de 2018, cada uma com cargo, partido, votos e "Eleito(a)"

#### Scenario: Voto não informado
- **WHEN** o TSE não informa os votos de uma disputa
- **THEN** a coluna de votos mostra "—"
