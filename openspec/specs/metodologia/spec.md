# metodologia Specification

## Purpose
Define a página pública de metodologia do Cobra: fontes oficiais com a última coleta, metas de atualização, critério de votação relevante, regras editoriais, regra de temas dos planos e graus de vínculo entre obra e emenda.

## Requirements

### Requirement: Página de metodologia
O site SHALL ter uma página pública de metodologia, em linguagem simples, com: fontes oficiais (o que se usa, link e data da última coleta lida do banco), metas de atualização, os critérios de votação relevante com os números exatos, as regras editoriais, a lista de palavras de cada tema dos planos de governo e a regra de contagem, e os graus de vínculo entre obra e emenda.

#### Scenario: Critérios de relevância
- **WHEN** alguém abre `/metodologia#relevancia`
- **THEN** lê os quatro critérios, incluindo a diferença menor que 20% dos votantes

#### Scenario: Temas dos planos
- **WHEN** alguém abre a seção de temas
- **THEN** vê cada tema com as palavras usadas e a regra de ao menos duas ocorrências por página

#### Scenario: Última coleta
- **WHEN** alguém lê a lista de fontes
- **THEN** cada fonte com dados mostra a data da última coleta; sem dado, "—" com o motivo

### Requirement: Acesso à metodologia
O rodapé SHALL ter link para a metodologia, e as explicações de relevância e de temas SHALL levar à seção correspondente.

#### Scenario: Link de relevância
- **WHEN** alguém segue o link de relevância numa votação
- **THEN** chega à seção de critérios da metodologia
