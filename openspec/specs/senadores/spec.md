# senadores Specification

## Purpose
Define quais dados de senadores o Cobra guarda, de onde vêm (API de Dados Abertos do Senado Federal), como são atualizados e quais regras valem antes de publicar.

## Requirements

### Requirement: Senadores em exercício no cadastro
A coleta do Senado SHALL registrar todos os senadores em exercício, de todas as UFs, cada um como político com nome civil, nome parlamentar, data de nascimento e endereço da foto oficial, ligado ao seu identificador do Senado.

#### Scenario: Senadores do DF
- **WHEN** a coleta termina com o Senado informando 3 senadores em exercício pelo DF
- **THEN** a consulta de mandatos abertos em exercício de senador da UF 53 retorna esses 3 políticos

### Requirement: Mandato de senador
Cada senador em exercício SHALL ter um mandato de senador no Senado Federal, pela UF que representa, com a primeira legislatura do mandato, a data de início e a situação. O titular SHALL ter o mandato iniciado no começo da primeira legislatura do mandato; o suplente, no início do período de exercício atual.

#### Scenario: Titular eleito em 2022
- **WHEN** um titular tem mandato cuja primeira legislatura é a 57
- **THEN** o mandato registrado é da legislatura 57, começa em 01/02/2023 e tem situação titular

#### Scenario: Suplente em exercício
- **WHEN** um suplente está em exercício desde uma data
- **THEN** o mandato dele começa nessa data e tem situação suplente

### Requirement: Afastamento de titular
Um titular afastado temporariamente (licença, cargo de ministro ou secretário) SHALL manter o mandato aberto com situação licenciado e SHALL voltar a titular ao reassumir. Um titular afastado de vez (renúncia, falecimento, cassação, perda do mandato) SHALL ter o mandato encerrado na data informada pelo Senado. Registros SHALL nunca ser apagados.

#### Scenario: Titular afastado
- **WHEN** um titular que estava em exercício aparece na lista de afastados
- **THEN** o mandato dele continua aberto, com situação licenciado

#### Scenario: Titular que renuncia
- **WHEN** um titular que estava em exercício aparece entre os afastados por renúncia numa data
- **THEN** o mandato dele passa a ter essa data de fim

### Requirement: Saída de suplente e listas completas
Um suplente que deixa o exercício SHALL ter o mandato encerrado na data de fim do exercício informada pelo Senado. A coleta SHALL só mexer em mandatos depois de obter as duas listas (em exercício e afastados); se alguma falhar, nenhum mandato muda.

#### Scenario: Suplente que volta para a suplência
- **WHEN** um suplente que estava em exercício aparece entre os afastados com o exercício encerrado numa data
- **THEN** o mandato dele passa a ter essa data de fim

#### Scenario: Lista indisponível
- **WHEN** a lista de afastados não pode ser obtida
- **THEN** nenhum mandato é encerrado nem muda de situação

### Requirement: Filiações com datas do Senado
A coleta SHALL registrar o histórico de filiações partidárias de cada senador com as datas de filiação e desfiliação informadas pelo Senado, com no máximo uma filiação aberta. Senador sem partido SHALL ficar sem filiação aberta.

#### Scenario: Troca de partido
- **WHEN** o Senado informa que um senador saiu do partido A numa data e entrou no partido B em outra
- **THEN** a filiação ao partido A fica encerrada na data de desfiliação e a filiação ao partido B fica aberta desde a data de filiação

### Requirement: Mesmo político na Câmara e no Senado
Quando um senador coletado tem o mesmo nome civil e a mesma data de nascimento de exatamente um político já cadastrado por outra fonte, a coleta SHALL ligar o identificador do Senado a esse político em vez de criar outro.

#### Scenario: Ex-deputado que virou senador
- **WHEN** um político já cadastrado pela Câmara tem o mesmo nome civil e data de nascimento de um senador coletado
- **THEN** existe um único político, com os identificadores da Câmara e do Senado

### Requirement: Coleta idempotente, validada e dentro do limite
Rodar a coleta de novo com os mesmos dados SHALL não criar registros novos. Um senador com dados estruturais inválidos SHALL não ser publicado, com o motivo registrado na tarefa, sem impedir os demais. A coleta SHALL fazer no máximo 8 requisições por segundo, abaixo do limite de 10 informado pelo Senado, guardar a resposta bruta e repetir com espera crescente em 429 e 503.

#### Scenario: Segunda coleta igual
- **WHEN** a coleta roda duas vezes com as mesmas respostas do Senado
- **THEN** a quantidade de políticos, mandatos, filiações e partidos é a mesma depois das duas

#### Scenario: UF desconhecida
- **WHEN** o Senado informa um senador com UF que não existe no cadastro
- **THEN** esse senador não é publicado, a tarefa registra o motivo e os outros são publicados

### Requirement: Titular licenciado no cadastro
Um titular que está na lista de afastados por afastamento temporário (licença, cargo de ministro ou secretário) e ainda não está no cadastro SHALL ser cadastrado com mandato aberto em situação licenciado, porque continua titular do mandato e pode ser autor de emendas. Ele SHALL não contar na bancada em exercício.

#### Scenario: Senadora licenciada
- **WHEN** a lista de afastados traz uma titular licenciada que não estava no cadastro
- **THEN** ela passa a existir no cadastro com mandato aberto em situação licenciado e fica fora da bancada em exercício da UF
