# Spec Delta

## Purpose

Define o critério objetivo e auditável de votação relevante (DDR §9.2) e a lista de eventos que alimenta o feed.

## ADDED Requirements

### Requirement: Critérios objetivos de relevância
Uma votação nominal SHALL ser relevante quando atende a pelo menos um critério: Governo e Oposição orientaram posições diferentes; a diferença entre "sim" e "não" é menor que 20% dos votantes; a matéria é PEC, medida provisória, projeto de lei complementar, lei orçamentária ou veto; ou houve curadoria editorial com justificativa registrada. Os critérios atendidos SHALL ficar disponíveis para exibição.

#### Scenario: Divergência
- **WHEN** o Governo orienta "Sim" e a Oposição orienta "Não"
- **THEN** a votação é relevante pelo critério de divergência

#### Scenario: Liberado não é posição
- **WHEN** o Governo orienta "Sim" e a Oposição libera a bancada
- **THEN** o critério de divergência não é atendido

#### Scenario: Placar disputado
- **WHEN** a votação teve 230 "sim", 200 "não" e 10 outros
- **THEN** a votação é relevante, pois a diferença de 30 é menor que 20% de 440 votantes

#### Scenario: PEC
- **WHEN** a votação é de uma PEC
- **THEN** a votação é relevante pelo tipo de matéria

### Requirement: Simbólica e secreta fora da relevância
Votações simbólicas e secretas SHALL nunca ser marcadas como votação relevante; a simbólica com proposição SHALL entrar na lista de eventos como evento da proposição, sem voto individual.

#### Scenario: Simbólica
- **WHEN** o Plenário aprova uma PEC em votação simbólica
- **THEN** ela aparece como evento da proposição e não como votação relevante

### Requirement: Relevância no perfil
O perfil SHALL indicar, em "Como votou", as votações relevantes com os critérios atendidos em palavras.

#### Scenario: PEC com placar disputado
- **WHEN** o deputado votou numa PEC com placar disputado
- **THEN** a votação mostra "Votação relevante: placar disputado; tipo de matéria: PEC"
