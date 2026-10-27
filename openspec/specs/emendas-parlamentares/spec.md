# emendas-parlamentares Specification

## Purpose
Define quais dados de emendas parlamentares o Cobra guarda, de onde vêm (Portal da Transparência e Obrasgov.br), como o autor da emenda vira político do cadastro e como a emenda é ligada à obra, sempre com o grau de confiança do vínculo.

## Requirements

### Requirement: Emendas com destino ao DF
A coleta SHALL guardar as emendas parlamentares com destino ao DF (UF ou município de Brasília) informadas pelo Portal da Transparência, e também as citadas por empenhos de obras do DF qualquer que seja o destino, uma por código de emenda, com ano, tipo, número, autor, área (função e subfunção), localidade e os valores empenhado, liquidado e pago somados das linhas da fonte.

#### Scenario: Emenda de um senador do DF
- **WHEN** o arquivo do Portal da Transparência traz a emenda 202640820001 de LEILA BARROS com destino ao DISTRITO FEDERAL (UF)
- **THEN** a emenda fica guardada com ano 2026, autor de código 4082 e os valores somados das linhas dela

#### Scenario: Emenda de outro estado
- **WHEN** o arquivo traz uma emenda com destino a SÃO PAULO (UF) que nenhum empenho de obra do DF cita
- **THEN** ela não é guardada

#### Scenario: Emenda nacional executada numa obra do DF
- **WHEN** um empenho de obra do DF cita uma emenda de destino "Nacional"
- **THEN** essa emenda também é guardada, com a localidade como veio, para que o vínculo direto apareça

#### Scenario: Linha sem código de emenda
- **WHEN** uma linha com destino ao DF vem com código de emenda "Sem informação"
- **THEN** ela não vira emenda e a coleta registra quantas linhas foram descartadas assim

### Requirement: Autor ligado ao político
Cada autor de emenda SHALL ser guardado com o código da fonte, o nome e o tipo (individual, bancada, comissão ou relator). Um autor individual SHALL ser ligado ao político do cadastro quando o nome casa, sem acentos e sem diferença de maiúsculas, com o nome parlamentar de exatamente um deputado federal ou senador; senão, SHALL ficar sem político, nunca ligado a um político escolhido ao acaso.

#### Scenario: Senadora do DF
- **WHEN** o autor de código 4082 tem o nome LEILA BARROS e há exatamente uma senadora "Leila Barros" no cadastro
- **THEN** o autor fica ligado a essa senadora

#### Scenario: Emenda de bancada
- **WHEN** o autor é BANCADA DO DISTRITO FEDERAL
- **THEN** ele fica guardado como autor do tipo bancada, sem político

### Requirement: Vínculo direto entre obra e emenda
Uma obra SHALL ser ligada a uma emenda com grau de confiança "direto" quando um empenho da obra no Obrasgov identifica a emenda (pelo código completo, ou pelo autor e número no ano do empenho) e essa emenda está entre as emendas guardadas. Empenhos cujo identificador não corresponde a uma emenda guardada SHALL não criar vínculo.

#### Scenario: Código completo no empenho
- **WHEN** um empenho de uma obra informa o identificador "202542680008"
- **THEN** se existir a emenda 202542680008, a obra fica ligada a ela com grau "direto" e ao autor dela

#### Scenario: Autor e número no empenho
- **WHEN** um empenho de 2026 informa o identificador "71080013"
- **THEN** se existir a emenda 202671080013, a obra fica ligada a ela com grau "direto"

#### Scenario: Identificador sem correspondência
- **WHEN** o identificador do empenho é "1aaelz", tem um número de dígitos que não permite reconstruir o código (como "20264268000.0", com 11 dígitos) ou não corresponde a nenhuma emenda guardada
- **THEN** nenhum vínculo é criado e o identificador fica guardado como veio

### Requirement: Emendas por área no lugar
O banco SHALL permitir contar as emendas e somar os valores com destino a um lugar por área (função), para mostrar o que chegou ao DF sem ligar cada obra a cada emenda do DF.

#### Scenario: Emendas de saúde no DF
- **WHEN** se consultam as emendas com destino ao DF na função Saúde
- **THEN** o resultado traz a quantidade de emendas e os valores empenhado, liquidado e pago somados

### Requirement: Atualização idempotente e rastreável
Rodar a coleta de novo com o mesmo arquivo SHALL não criar registros novos e SHALL atualizar os valores que mudaram. Cada emenda SHALL guardar a fonte, o código original e a data de coleta.

#### Scenario: Segunda coleta igual
- **WHEN** a coleta roda duas vezes com o mesmo arquivo
- **THEN** a quantidade de autores e emendas é a mesma depois das duas
