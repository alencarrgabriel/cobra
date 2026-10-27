# Spec Delta

## ADDED Requirements

### Requirement: Proposição da votação da Câmara
A votação da Câmara SHALL ter como proposição a que o arquivo de votações indica, quando ela está listada e não é requerimento; senão a primeira matéria listada que não seja requerimento; senão a primeira listada.

#### Scenario: Requerimento de urgência
- **WHEN** a votação é de um requerimento de urgência e o arquivo lista o REQ e o PL a que ele se refere
- **THEN** a proposição da votação é o PL
