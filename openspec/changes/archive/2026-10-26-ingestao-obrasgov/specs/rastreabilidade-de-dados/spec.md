# Spec Delta

## MODIFIED Requirements

### Requirement: Fontes de uma lista conhecida
A fonte de cada linha SHALL ser uma das fontes cadastradas (Câmara, Senado, TSE, CLDF, IBGE, Obrasgov.br ou curadoria do Cobra); valores fora da lista SHALL ser rejeitados.

#### Scenario: Fonte desconhecida
- **WHEN** se tenta gravar uma linha com fonte `wikipedia`
- **THEN** o banco rejeita a gravação

#### Scenario: Obra do Obrasgov
- **WHEN** se grava uma obra com fonte `obrasgov`
- **THEN** a gravação é aceita
