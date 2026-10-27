# obras-federais Specification

## Purpose
Define quais dados de obras com recurso federal o Cobra guarda a partir do Obrasgov.br, como eles são atualizados e quais regras de qualidade valem antes de publicá-los, para que o cidadão veja valor, prazo, situação, andamento e motivo de paralisação das obras da sua cidade.

## Requirements

### Requirement: Obras do DF guardadas com os dados oficiais
Para cada obra com UF principal DF no Obrasgov.br, o Cobra SHALL guardar: nome, descrição, endereço, área, natureza e espécie da intervenção, situação, órgão responsável, quem repassa, recebe e executa, valor previsto, prazos previstos e efetivos, coordenadas quando houver, se o gestor enviou foto, e o identificador original da obra.

#### Scenario: Obra concluída
- **WHEN** a coleta processa uma obra que o Obrasgov informa como "Concluída" com valor previsto de R$ 1.000.000,00
- **THEN** a obra fica guardada com situação concluída, valor previsto 1000000.00, o identificador original e o link para conferir na fonte

#### Scenario: Obra sem coordenadas
- **WHEN** o Obrasgov não informa a localização de uma obra
- **THEN** a obra é guardada sem coordenadas, e não com coordenadas zeradas

### Requirement: Andamento e histórico de paralisação
Para cada obra, o Cobra SHALL guardar os registros de execução física (percentual e datas) e o histórico de paralisação e cancelamento com a data e a justificativa oficial; eventos repetidos pela fonte (mesma situação, data e justificativa) SHALL aparecer uma única vez.

#### Scenario: Obra paralisada
- **WHEN** o Obrasgov informa que uma obra foi paralisada em 07/05/2025 com uma justificativa
- **THEN** a obra tem um evento "Paralisada" em 07/05/2025 com essa justificativa

#### Scenario: Evento repetido na fonte
- **WHEN** a fonte devolve 129 registros idênticos de paralisação para a mesma obra
- **THEN** o Cobra guarda um único evento

#### Scenario: Percentual mais recente
- **WHEN** uma obra tem mais de um registro de execução física
- **THEN** o percentual exibido como atual é o do registro atualizado mais recentemente

### Requirement: Data de atualização da fonte
Toda obra e todo registro ligado a ela SHALL guardar a data da última atualização da base do Obrasgov.br informada pela própria fonte, além da data em que o Cobra coletou.

#### Scenario: Base atualizada em 23/10
- **WHEN** a coleta roda e o Obrasgov informa última atualização em 23/10/2026
- **THEN** as obras coletadas têm data de atualização na fonte 23/10/2026

### Requirement: Validação antes de publicar
Uma página de obras SHALL ser publicada só se todas as obras dela passarem nas regras de estrutura: identificador no formato do Obrasgov, situação conhecida, UF principal igual à pedida, nome presente, valores não negativos e percentual de execução entre 0 e 100. Uma página reprovada SHALL não impedir a coleta das páginas seguintes.

#### Scenario: Percentual impossível
- **WHEN** a fonte informa execução física de 140%
- **THEN** nada daquela tarefa é publicado e o erro fica registrado com o identificador da obra

#### Scenario: Página reprovada não trava as outras
- **WHEN** a página 3 de obras é reprovada na validação
- **THEN** as páginas 4 em diante continuam sendo coletadas

### Requirement: Dado incoerente publicado como informado, com nota
Incoerências de conteúdo informadas pela fonte, como término previsto anterior ao início previsto, SHALL ser publicadas exatamente como a fonte informa, acompanhadas de uma nota de qualidade que descreve a incoerência; o Cobra SHALL não corrigir nem descartar o dado.

#### Scenario: Término antes do início
- **WHEN** a fonte informa início previsto em 10/01/2025 e término previsto em 10/01/2024
- **THEN** a obra é publicada com essas datas e com a nota "término previsto anterior ao início previsto, informado assim pela fonte"

### Requirement: Atualização sem duplicar
Coletas repetidas SHALL atualizar as obras já guardadas, sem criar duplicatas, e SHALL refletir mudanças de situação informadas pela fonte.

#### Scenario: Obra muda de situação
- **WHEN** uma obra coletada como "Em execução" aparece como "Paralisada" na coleta seguinte
- **THEN** existe uma única obra com esse identificador, agora com situação paralisada

### Requirement: Empenhos de cada obra
A coleta do Obrasgov SHALL guardar os empenhos de cada obra do DF, com número do empenho, data de emissão, valor, resultado primário e o campo que identifica a emenda parlamentar, como informado pela fonte.

#### Scenario: Empenho pago por emenda
- **WHEN** o Obrasgov informa um empenho de uma obra com o identificador da emenda preenchido
- **THEN** o empenho fica guardado ligado à obra, com o identificador como veio e a emenda reconhecida a partir dele

#### Scenario: Empenho sem emenda
- **WHEN** o Obrasgov informa um empenho com o identificador da emenda igual a "0" ou vazio
- **THEN** o empenho fica guardado sem emenda reconhecida
