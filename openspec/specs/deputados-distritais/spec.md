# deputados-distritais Specification

## Purpose
Define quais dados de deputados distritais o Cobra guarda, de onde vêm (site oficial da Câmara Legislativa do Distrito Federal), como são atualizados e quais regras valem antes de publicar.

## Requirements

### Requirement: Distritais em exercício no cadastro
A coleta da CLDF SHALL registrar os deputados distritais da legislatura atual, cada um como político com nome civil, nome parlamentar, data de nascimento e foto oficial, ligado ao seu identificador da CLDF, e com um mandato de deputado distrital na CLDF pelo DF.

#### Scenario: Os 24 distritais
- **WHEN** a coleta termina com o site da CLDF listando 24 deputados na legislatura atual
- **THEN** a consulta de mandatos abertos de deputado distrital da UF 53 retorna esses 24 políticos

#### Scenario: Dados do perfil
- **WHEN** o perfil de um deputado informa nome completo "Francisco Domingos dos Santos" e nascimento em 08/09/1954
- **THEN** o político Chico Vigilante tem esse nome civil e essa data de nascimento

### Requirement: Partido informado pela CLDF
A coleta SHALL registrar como filiação atual o partido informado pela CLDF quando ele é um partido existente, identificado pela sigla. Quando o partido informado não existe mais ou não é reconhecido, a coleta SHALL deixar o deputado sem filiação atual e registrar o caso, em vez de mostrar um partido errado.

#### Scenario: Partido com sigla
- **WHEN** o perfil informa "Partido dos Trabalhadores (PT)"
- **THEN** a filiação atual do deputado é ao partido de sigla PT

#### Scenario: Partido que não existe mais
- **WHEN** o perfil informa "Democrata", partido extinto em 2022
- **THEN** o deputado fica sem filiação atual e a tarefa registra o partido não reconhecido

### Requirement: Mandato na legislatura atual
O mandato SHALL começar no início da legislatura informada pela CLDF e ter situação titular enquanto o deputado constar da lista, porque o site não distingue titular de suplente nem informa a data de posse. Quem deixa de constar da lista SHALL ter o mandato encerrado na data da coleta; registros SHALL nunca ser apagados.

#### Scenario: Mandato da legislatura 2023–2026
- **WHEN** um deputado consta da lista da legislatura 2023–2026
- **THEN** o mandato dele começa em 01/01/2023 e não tem data de fim

#### Scenario: Deputado que sai da lista
- **WHEN** um deputado da coleta anterior não aparece mais na lista
- **THEN** o mandato dele passa a ter a data da coleta como fim

### Requirement: Lista completa antes de publicar
A coleta SHALL só publicar e encerrar mandatos se a página da legislatura atual trouxer ao menos 20 deputados, cada um com nome, partido e endereço de perfil. Fora disso, SHALL falhar sem mexer em nenhum dado, porque uma página que mudou de formato não pode apagar a bancada.

#### Scenario: Página que mudou de formato
- **WHEN** a página da legislatura atual traz menos de 20 deputados reconhecíveis
- **THEN** a tarefa falha, registra o motivo e nenhum mandato é criado ou encerrado

### Requirement: Mesmo político em outra casa
Quando um distrital coletado tem o mesmo nome civil e a mesma data de nascimento de exatamente um político já cadastrado por outra fonte, a coleta SHALL ligar o identificador da CLDF a esse político em vez de criar outro.

#### Scenario: Ex-deputado federal que virou distrital
- **WHEN** um político já cadastrado pela Câmara tem o mesmo nome civil e data de nascimento de um distrital coletado
- **THEN** existe um único político, com os identificadores da Câmara e da CLDF

### Requirement: Coleta idempotente e respeitosa
Rodar a coleta de novo com as mesmas páginas SHALL não criar registros novos. A coleta SHALL fazer no máximo 1 requisição por segundo ao site da CLDF, guardar a página bruta e não guardar a lista nominal de servidores do portal de dados abertos.

#### Scenario: Segunda coleta igual
- **WHEN** a coleta roda duas vezes com as mesmas páginas
- **THEN** a quantidade de políticos, mandatos e filiações é a mesma depois das duas
