# tela-de-planos-de-governo Specification

## Purpose
Define as páginas de plano de governo do Cobra: plano por tema com trechos literais e a página do PDF oficial, busca por palavra e obras da mesma área, sem resumo, sem IA e sem afirmar se uma promessa foi cumprida.

## Requirements

### Requirement: Lista de planos
O site SHALL ter uma página com os planos de governo guardados, cada um com cargo, eleição, chapa, partido como registrados no TSE, número de páginas e fonte.

#### Scenario: Planos do piloto
- **WHEN** alguém abre a lista de planos
- **THEN** vê o plano do governador do DF e o do presidente, da eleição de 2022, com a fonte TSE

### Requirement: Plano por tema com trecho literal
Cada plano SHALL ter página permanente com os temas em ordem alfabética e o número de páginas em que cada um aparece. Ao escolher um tema, a página SHALL mostrar trechos copiados do texto do PDF, sem reescrita, com as palavras do tema destacadas e um link que abre o PDF oficial na página do trecho. As palavras usadas para marcar o tema SHALL aparecer na tela.

#### Scenario: Tema Saúde
- **WHEN** alguém escolhe o tema Saúde no plano do governador do DF
- **THEN** vê trechos das páginas que falam de saúde, cada um com "Página N" levando ao PDF oficial em `#page=N`

#### Scenario: Acentos
- **WHEN** a palavra do tema é "saude" e o PDF diz "Saúde"
- **THEN** o trecho mostra "Saúde" como no PDF, destacado

#### Scenario: Ordem neutra
- **WHEN** a página lista os temas
- **THEN** a ordem é alfabética, não pela quantidade de páginas

### Requirement: Obras da mesma área sem juízo de cumprimento
Ao lado de um tema, a página SHALL mostrar obras com recurso federal da mesma área no DF, em ordem alfabética, com a situação e o total, e a frase de que o Cobra não afirma se uma promessa foi cumprida. Tema sem área de obra correspondente SHALL dizer isso.

#### Scenario: Obras de saúde
- **WHEN** o tema Saúde está aberto
- **THEN** aparecem obras do DF da área "Saúde" com a situação e a frase "Não afirma se uma promessa foi cumprida"

#### Scenario: Tema sem área
- **WHEN** o tema Moradia está aberto
- **THEN** a página diz que nenhuma área de obra do Obrasgov.br corresponde a este tema

### Requirement: Busca por palavra no plano
A página do plano SHALL buscar uma palavra no texto, achando variações (plural) e ignorando acentos, e mostrar as páginas com trechos literais e o link para o PDF.

#### Scenario: Plural sem acento
- **WHEN** alguém busca "creche" num plano que diz "creches"
- **THEN** a página aparece com o trecho e "creches" destacado

#### Scenario: Nada encontrado
- **WHEN** a palavra não está no plano
- **THEN** a página diz que a palavra não aparece no plano

### Requirement: PDF oficial servido sem alteração
O site SHALL servir o PDF guardado byte a byte, como `application/pdf`, e a página do plano SHALL mostrar o hash SHA-256 do arquivo.

#### Scenario: Abrir o PDF
- **WHEN** alguém abre o link do PDF do plano
- **THEN** recebe o arquivo com o mesmo hash mostrado na página

### Requirement: Endereço inexistente
Um endereço de plano que não existe SHALL responder com a página "não encontrada" e status 404.

#### Scenario: Plano inexistente
- **WHEN** alguém abre `/planos/2018-governador-sp`
- **THEN** recebe status 404
