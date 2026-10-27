# Proposal

## Why

A busca "CEP, cidade ou UF" (RF-01) precisa reconhecer o nome da cidade e chegar ao código IBGE do município (RF-02, RF-60). Hoje o banco tem as 27 UFs e só um município, Brasília. As fotos de senadores apontam para um endereço `http://` que redireciona; o site vai servir as fotos pelo próprio servidor e precisa do endereço final em `https://`.

## What Changes

- Adaptador `ibge` para os coletores: os 5.571 municípios da API de localidades do IBGE (`servicodados.ibge.gov.br/api/v1/localidades/municipios`, conferida em 2026-10-26, uma requisição, sem chave), gravados em `core.localities` como municípios ligados à sua UF.
- Coluna `search_name` em `core.localities` (nome sem acentos, em minúsculas), com índice, preenchida pelo coletor, para a busca por cidade.
- Endereço da foto oficial dos senadores no formato final `https://legis.senado.leg.br/senadores/fotos-oficiais/<código>`, para onde o endereço da lista redireciona.

Requisitos do DDR cobertos: RF-01 e RF-02 (dados para a busca por cidade), RF-60 (código IBGE do município), RF-09 (foto oficial), RNF-16, §6.1 (IBGE).

Fora de escopo:
- A tela de busca (`busca-geografica`).
- CEP → município fora do DF: depende da base de CEP, cuja licença e custo o DDR deixa para decisão. Fica para a fase 2.

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `cadastro-de-representantes`: o banco passa a conter todos os municípios, não só as UFs.
- `senadores`: a foto oficial é guardada no endereço `https` final.

## Impact

- Migração: coluna `search_name` e índice em `core.localities`.
- Adaptador novo `collectors/src/cobra_collectors/sources/ibge.py`.
- `senado_model.py`: endereço da foto.
- `docs/coleta.md`.
