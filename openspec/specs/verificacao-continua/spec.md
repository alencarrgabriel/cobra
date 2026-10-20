# verificacao-continua Specification

## Purpose
Define as verificações automáticas que toda contribuição ao repositório público precisa passar antes de entrar na branch principal, cobrindo o site e os coletores, para que erros e segredos sejam barrados sem depender de revisão manual.

## Requirements

### Requirement: Verificações do site em cada contribuição
Cada push e pull request SHALL disparar, para o site, lint, checagem de formatação, checagem de tipos, testes de unidade, compilação de produção e testes de navegador das páginas principais.

#### Scenario: Erro de tipo no site
- **WHEN** um pull request introduz um erro de tipo TypeScript em `web/`
- **THEN** a verificação do site falha e o pull request fica marcado como reprovado

#### Scenario: Teste de navegador da página inicial
- **WHEN** a verificação do site roda
- **THEN** a página inicial é aberta num navegador automatizado e os cenários de `aplicacao-web-base` são conferidos

### Requirement: Verificações dos coletores em cada contribuição
Cada push e pull request SHALL disparar, para os coletores, lint, checagem de formatação, checagem de tipos e testes, sem acesso de rede a APIs externas durante os testes.

#### Scenario: Teste tentando acessar a internet
- **WHEN** um teste dos coletores tenta abrir conexão com um servidor externo
- **THEN** o teste falha indicando que acesso à rede não é permitido nos testes

#### Scenario: Erro de lint nos coletores
- **WHEN** um pull request introduz código Python que viola as regras de lint
- **THEN** a verificação dos coletores falha

### Requirement: Varredura de segredos
Cada push e pull request SHALL ser varrido em busca de credenciais expostas, e a verificação SHALL falhar se alguma for encontrada.

#### Scenario: Chave de API commitada
- **WHEN** um commit adiciona um arquivo contendo uma chave de API em formato reconhecível
- **THEN** a varredura de segredos falha e indica o arquivo e a linha

### Requirement: Mesmos comandos local e no CI
Cada verificação executada no CI SHALL poder ser executada localmente por um comando documentado no `CONTRIBUTING.md`, com o mesmo resultado.

#### Scenario: Contribuidor roda as verificações antes de enviar
- **WHEN** um contribuidor executa o comando documentado de verificação completa na raiz do repositório
- **THEN** lint, tipos e testes do site e dos coletores são executados e o comando termina com código zero se tudo passar

### Requirement: Verificações do banco em cada contribuição
Cada push e pull request SHALL aplicar todas as migrações num Postgres vazio e rodar os testes de banco; a verificação SHALL falhar se alguma migração não aplicar ou algum teste falhar.

#### Scenario: Migração com erro de sintaxe
- **WHEN** um pull request adiciona uma migração com SQL inválido
- **THEN** a verificação do banco falha indicando a migração

#### Scenario: Testes isolados do banco de desenvolvimento
- **WHEN** os testes de banco rodam localmente
- **THEN** eles criam e apagam um banco descartável próprio, sem alterar os dados do banco de desenvolvimento
