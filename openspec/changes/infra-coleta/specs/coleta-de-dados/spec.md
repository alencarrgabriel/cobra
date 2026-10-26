# Spec Delta

## Purpose

Define como o Cobra busca dados nas fontes oficiais sem sobrecarregá-las e sem publicar dado errado: limites de requisição por fonte, retentativas com espera crescente, guarda da resposta bruta, validação antes de publicar, fila de tarefas e registro de cada execução.

## ADDED Requirements

### Requirement: Limite de requisições por fonte
Cada fonte SHALL ter um limite de requisições por segundo configurado, e os coletores SHALL nunca ultrapassá-lo, mesmo quando há muitas tarefas pendentes.

#### Scenario: Senado com limite de 10 por segundo
- **WHEN** o coletor do Senado tem 50 requisições a fazer
- **THEN** em nenhuma janela de 1 segundo são feitas mais requisições que o limite configurado para o Senado

### Requirement: Retentativa com espera crescente
Respostas HTTP 429, 502, 503 e 504 e falhas de rede SHALL ser repetidas com espera exponencial e variação aleatória, até um número máximo de tentativas; quando a fonte enviar o cabeçalho `Retry-After`, a espera SHALL ser de pelo menos o tempo indicado.

#### Scenario: Fonte responde 429 e depois 200
- **WHEN** a fonte responde 429 com `Retry-After: 2` e, na nova tentativa, 200
- **THEN** o coletor espera ao menos 2 segundos, repete e segue com a resposta 200

#### Scenario: Fonte continua fora do ar
- **WHEN** a fonte responde 503 em todas as tentativas
- **THEN** o coletor desiste após o número máximo de tentativas e a tarefa é marcada para tentar de novo mais tarde

#### Scenario: Erro que não adianta repetir
- **WHEN** a fonte responde 404
- **THEN** o coletor não repete a requisição e registra o erro

### Requirement: Resposta bruta guardada
Toda resposta obtida de uma fonte SHALL ser guardada como veio, com a fonte, o endereço, os parâmetros, o código HTTP, a data e hora e um hash do conteúdo, antes de qualquer normalização; arquivos grandes (ZIP, PDF) SHALL ser guardados em disco com o caminho e o hash registrados no banco.

#### Scenario: Resposta JSON
- **WHEN** o coletor recebe uma resposta JSON de uma fonte
- **THEN** existe um registro bruto com o corpo original e os metadados da requisição

#### Scenario: Arquivo grande
- **WHEN** o coletor baixa um ZIP do TSE
- **THEN** o arquivo fica no diretório de dados brutos e o banco registra o caminho, o tamanho e o hash SHA-256

### Requirement: Validação antes de publicar
O processamento de uma tarefa SHALL normalizar, validar e publicar os dados numa única transação; se qualquer validação falhar, nenhum dado da tarefa SHALL ser publicado e o motivo SHALL ser registrado.

#### Scenario: Validação reprovada
- **WHEN** a normalização produz um registro que não passa na validação
- **THEN** nada daquela tarefa aparece nas tabelas publicadas e a tarefa registra o erro de validação

### Requirement: Fila de tarefas
As coletas SHALL ser divididas em tarefas numa fila no próprio banco; cada tarefa SHALL ser processada por um único trabalhador por vez, SHALL ser reagendada com espera crescente quando falhar, e SHALL ficar marcada como falha definitiva depois do número máximo de tentativas.

#### Scenario: Dois trabalhadores ao mesmo tempo
- **WHEN** dois trabalhadores pegam tarefas da fila ao mesmo tempo
- **THEN** nenhuma tarefa é entregue aos dois

#### Scenario: Falha e nova tentativa
- **WHEN** uma tarefa falha pela primeira vez
- **THEN** ela volta para a fila com a próxima execução marcada para mais tarde

#### Scenario: Esgotou as tentativas
- **WHEN** uma tarefa falha pela última tentativa permitida
- **THEN** ela fica marcada como falha definitiva e não é mais entregue

### Requirement: Registro de execuções
Cada execução de coleta SHALL ser registrada com fonte, início, fim, situação e contagens de tarefas concluídas e falhas, para alimentar o acompanhamento das integrações.

#### Scenario: Consulta de situação
- **WHEN** o comando de situação dos coletores é executado
- **THEN** ele mostra, por fonte, a última execução, a situação e as quantidades de tarefas pendentes, concluídas e em falha

### Requirement: Identificação do coletor
As requisições às fontes SHALL se identificar com um `User-Agent` que nomeia o Cobra e um endereço de contato do projeto.

#### Scenario: Cabeçalho enviado
- **WHEN** o coletor faz qualquer requisição a uma fonte
- **THEN** o cabeçalho `User-Agent` contém "Cobra" e o endereço do repositório do projeto
