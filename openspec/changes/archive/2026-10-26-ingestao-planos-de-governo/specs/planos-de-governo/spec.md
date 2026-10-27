# Spec Delta

## Purpose

Define quais planos de governo o Cobra guarda, de onde vêm (TSE), como o texto e os temas de cada página são extraídos e como se busca neles, sempre preservando o documento oficial.

## ADDED Requirements

### Requirement: Plano da chapa eleita
O banco SHALL guardar o plano de governo registrado no TSE pela chapa eleita para cada cargo coberto, com eleição, cargo, UF, chapa (titular e vice), partido, número do candidato no TSE, endereço do arquivo de origem e hash do PDF. No piloto, os cargos cobertos são presidente e governador do DF, da eleição de 2022.

#### Scenario: Governador do DF
- **WHEN** a coleta termina
- **THEN** existe o plano da eleição de 2022 para governador do DF da chapa de Ibaneis Rocha, eleita, com o número do candidato e o hash do PDF

#### Scenario: Plano de candidato não eleito
- **WHEN** o arquivo do TSE traz planos de candidatos não eleitos
- **THEN** esses planos não são guardados

### Requirement: Documento oficial preservado
O PDF oficial SHALL ser guardado sem alteração, com o mesmo hash do arquivo do TSE, para que o site possa mostrá-lo e abrir a página exata de um trecho.

#### Scenario: Hash conferido
- **WHEN** o plano é guardado
- **THEN** o hash do PDF guardado é igual ao hash do PDF de dentro do arquivo do TSE

### Requirement: Texto por página
A coleta SHALL guardar o texto extraído de cada página do plano, com o número da página, sem reescrever nem resumir. Páginas sem texto extraível SHALL ser registradas como sem texto.

#### Scenario: Trecho literal com página
- **WHEN** uma página do plano contém a palavra "creche"
- **THEN** a busca por "creche" retorna o plano e o número dessa página, com o texto como está no PDF

### Requirement: Temas por palavras fixas
Cada página SHALL receber os temas cujas palavras aparecem nela, a partir de uma lista fixa de temas e palavras, sem uso de IA. Cada tema SHALL indicar as áreas de obra que correspondem a ele.

#### Scenario: Página de saúde
- **WHEN** uma página fala de hospitais e UBS
- **THEN** ela recebe o tema Saúde, que corresponde à área de obra "Saúde"

### Requirement: Busca por palavra
O banco SHALL permitir buscar palavras no texto das páginas usando o dicionário do português, de forma que a busca encontre variações da mesma palavra.

#### Scenario: Plural
- **WHEN** se busca "escola" num plano que fala de "escolas"
- **THEN** a página aparece no resultado

### Requirement: Coleta mínima do arquivo de candidatos
A coleta SHALL usar o arquivo de candidatos do TSE só para identificar a chapa eleita e o número do candidato, e SHALL não guardar CPF, e-mail, título de eleitor nem outros dados pessoais do arquivo.

#### Scenario: Sem CPF
- **WHEN** o plano é guardado
- **THEN** nenhuma tabela do banco recebe o CPF ou o e-mail do candidato a partir do arquivo de candidatos
