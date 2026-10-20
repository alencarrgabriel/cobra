# rastreabilidade-de-dados Specification

## Purpose
Garante que todo dado público guardado pelo Cobra possa ser rastreado até a fonte oficial: de onde veio, com qual identificador original, onde conferir e quando foi coletado e atualizado, para que o site sempre mostre fonte e data.

## Requirements

### Requirement: Colunas de rastreabilidade em todo dado público
Toda tabela de dado público SHALL ter, em cada linha, a fonte oficial, o identificador original na fonte, o link para conferência quando existir, a data e hora da coleta e a data de atualização informada pela fonte quando existir. Fonte e data de coleta SHALL ser obrigatórias.

#### Scenario: Linha sem fonte
- **WHEN** se tenta gravar um mandato sem informar a fonte
- **THEN** o banco rejeita a gravação

#### Scenario: Linha sem data de coleta
- **WHEN** se tenta gravar um político sem informar a data de coleta
- **THEN** o banco rejeita a gravação

#### Scenario: Toda tabela nova segue a regra
- **WHEN** a verificação automática inspeciona as tabelas de dados públicos do banco
- **THEN** todas têm as colunas de rastreabilidade com os tipos e a obrigatoriedade definidos, e a verificação falha se alguma tabela não tiver

### Requirement: Fontes de uma lista conhecida
A fonte de cada linha SHALL ser uma das fontes cadastradas (Câmara, Senado, TSE, CLDF, IBGE ou curadoria do Cobra); valores fora da lista SHALL ser rejeitados.

#### Scenario: Fonte desconhecida
- **WHEN** se tenta gravar uma linha com fonte `wikipedia`
- **THEN** o banco rejeita a gravação

### Requirement: Identificador original único por fonte
Em cada tabela de dado público cujo registro tem identificador próprio na fonte, o par fonte e identificador original SHALL ser único, permitindo atualizar o registro em novas coletas sem duplicá-lo.

#### Scenario: Recoleta do mesmo partido
- **WHEN** a mesma combinação de fonte e identificador original de um partido é gravada pela segunda vez como inserção
- **THEN** o banco rejeita a duplicata e a coleta pode atualizar a linha existente

### Requirement: Dados fixos também rastreáveis
Dados carregados pelo próprio projeto, como a lista de UFs e de casas legislativas, SHALL indicar a fonte (IBGE ou curadoria do Cobra) e a data em que foram carregados.

#### Scenario: Origem das UFs
- **WHEN** a UF de código `35` é consultada
- **THEN** sua fonte é IBGE e sua data de coleta está preenchida
