# acesso-ao-banco Specification

## Purpose
Define quem pode ler e escrever o quê no banco do Cobra, aplicando o menor privilégio: o site só lê dados públicos, os coletores escrevem, e dados restritos de políticos e, no futuro, de usuários ficam fora do alcance do site.

## Requirements

### Requirement: Site com acesso somente leitura
O papel de banco usado pelo site SHALL poder ler as tabelas de dados públicos e SHALL ser impedido de inserir, alterar ou apagar qualquer linha.

#### Scenario: Leitura de mandatos pelo site
- **WHEN** o papel do site consulta a tabela de mandatos
- **THEN** a consulta é permitida

#### Scenario: Escrita pelo site
- **WHEN** o papel do site tenta inserir, alterar ou apagar um político
- **THEN** o banco nega a operação por falta de permissão

### Requirement: Coletores com escrita nos dados públicos
O papel de banco usado pelos coletores SHALL poder ler e gravar as tabelas de dados públicos, sem poder alterar a estrutura do banco.

#### Scenario: Coletor grava um partido
- **WHEN** o papel dos coletores insere um partido válido
- **THEN** a gravação é permitida

#### Scenario: Coletor tenta alterar a estrutura
- **WHEN** o papel dos coletores tenta criar ou apagar uma tabela
- **THEN** o banco nega a operação

### Requirement: Documentos de políticos fora do alcance do site
O CPF de políticos, usado apenas para cruzar fontes, SHALL ficar em tabela separada que o papel do site não pode ler.

#### Scenario: Site tenta ler CPF
- **WHEN** o papel do site consulta a tabela de documentos restritos de políticos
- **THEN** o banco nega a operação por falta de permissão

### Requirement: Dados do Cobra fora da API automática do Supabase
As tabelas de dados públicos SHALL ficar num esquema não exposto pela API REST automática do Supabase, e os papéis anônimos do Supabase SHALL não ter acesso a ele.

#### Scenario: Acesso anônimo
- **WHEN** o papel anônimo do Supabase tenta ler a tabela de políticos
- **THEN** o banco nega a operação por falta de permissão

### Requirement: Credenciais dos papéis fora das migrações
As migrações SHALL criar os papéis sem senha e sem permissão de login; usuários com login e senha SHALL ser criados por ambiente, fora do repositório, e associados a esses papéis.

#### Scenario: Migração sem senha
- **WHEN** as migrações do repositório são inspecionadas
- **THEN** nenhuma contém senha ou cria papel com permissão de login

### Requirement: Dados brutos e operacionais restritos aos coletores
Os esquemas de dados brutos e de operação dos coletores (fila e execuções) SHALL ser acessíveis apenas ao papel dos coletores; o papel do site SHALL não ter acesso a eles.

#### Scenario: Site tenta ler a fila
- **WHEN** o papel do site consulta a tabela de tarefas da fila
- **THEN** o banco nega a operação por falta de permissão

#### Scenario: Coletor grava resposta bruta
- **WHEN** o papel dos coletores grava uma resposta bruta
- **THEN** a gravação é permitida
