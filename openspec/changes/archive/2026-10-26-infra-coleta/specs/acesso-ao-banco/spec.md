# Spec Delta

## ADDED Requirements

### Requirement: Dados brutos e operacionais restritos aos coletores
Os esquemas de dados brutos e de operação dos coletores (fila e execuções) SHALL ser acessíveis apenas ao papel dos coletores; o papel do site SHALL não ter acesso a eles.

#### Scenario: Site tenta ler a fila
- **WHEN** o papel do site consulta a tabela de tarefas da fila
- **THEN** o banco nega a operação por falta de permissão

#### Scenario: Coletor grava resposta bruta
- **WHEN** o papel dos coletores grava uma resposta bruta
- **THEN** a gravação é permitida
