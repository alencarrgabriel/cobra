# Spec Delta

## Purpose

Garante que site e coletores recebam toda configuração e credencial por variáveis de ambiente documentadas, falhem cedo e com clareza quando falta algo, e nunca exponham segredos no repositório público nem em mensagens de erro.

## ADDED Requirements

### Requirement: Configuração documentada em arquivo de exemplo
O repositório SHALL conter um `.env.example` que lista toda variável de ambiente lida pelo site ou pelos coletores, com comentário em português explicando o uso e indicando se é obrigatória, sem nenhum valor secreto real.

#### Scenario: Variável nova sem documentação
- **WHEN** o código passa a ler uma variável de ambiente que não está no `.env.example`
- **THEN** a verificação automática falha indicando o nome da variável não documentada

#### Scenario: Exemplo sem segredos
- **WHEN** o `.env.example` é inspecionado
- **THEN** variáveis de credencial aparecem vazias ou com valor de exemplo evidente (ex.: `troque-me`)

### Requirement: Validação da configuração na partida
O site e os coletores SHALL validar a configuração ao iniciar e, se faltar variável obrigatória ou houver valor inválido, SHALL encerrar com mensagem que nomeia a variável sem exibir valores.

#### Scenario: Variável obrigatória ausente nos coletores
- **WHEN** o comando dos coletores é executado sem uma variável obrigatória definida
- **THEN** o processo termina com código de saída diferente de zero
- **AND** a mensagem de erro cita o nome da variável ausente

#### Scenario: Valor inválido não é exibido
- **WHEN** uma variável de credencial tem formato inválido
- **THEN** a mensagem de erro cita o nome da variável e o problema, sem incluir o valor recebido

### Requirement: Nenhum segredo versionado
Arquivos de ambiente locais (`.env`, `.env.local` e variações) SHALL ser ignorados pelo controle de versão, exceto `.env.example`.

#### Scenario: Arquivo local de ambiente
- **WHEN** um contribuidor cria `.env` ou `web/.env.local` com credenciais
- **THEN** o git não lista esses arquivos como candidatos a commit

### Requirement: Segredos fora do código entregue ao navegador
Somente variáveis explicitamente marcadas como públicas SHALL ser incluídas no código enviado ao navegador; credenciais SHALL ficar restritas ao servidor e aos coletores.

#### Scenario: Credencial do servidor
- **WHEN** o site é compilado com uma credencial de servidor definida
- **THEN** o valor dessa credencial não aparece em nenhum arquivo estático gerado para o navegador
