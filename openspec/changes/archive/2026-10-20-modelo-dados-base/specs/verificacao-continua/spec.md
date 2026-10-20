# Spec Delta

## ADDED Requirements

### Requirement: Verificações do banco em cada contribuição
Cada push e pull request SHALL aplicar todas as migrações num Postgres vazio e rodar os testes de banco; a verificação SHALL falhar se alguma migração não aplicar ou algum teste falhar.

#### Scenario: Migração com erro de sintaxe
- **WHEN** um pull request adiciona uma migração com SQL inválido
- **THEN** a verificação do banco falha indicando a migração

#### Scenario: Testes isolados do banco de desenvolvimento
- **WHEN** os testes de banco rodam localmente
- **THEN** eles criam e apagam um banco descartável próprio, sem alterar os dados do banco de desenvolvimento
