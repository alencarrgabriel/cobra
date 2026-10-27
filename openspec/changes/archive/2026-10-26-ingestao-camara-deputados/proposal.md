# Proposal

## Why

O Cobra mostra obras do DF, mas ainda não sabe quem representa o cidadão. Sem o cadastro de deputados federais, não dá para ligar emenda a parlamentar (`ingestao-emendas`), montar a bancada de cada UF (RF-03, RF-31) nem abrir o perfil de um político. A Câmara publica os deputados em exercício numa API aberta, conferida em 2026-10-26: 513 em exercício, 8 pelo DF, legislatura 57 (2023–2027). Esta change traz esse cadastro para o banco do Cobra pelo fluxo da `infra-coleta`.

## What Changes

- Adaptador `camara` para os coletores:
  - lista dos deputados em exercício (todas as UFs, 100 por página);
  - para cada deputado, uma tarefa de detalhe: dados cadastrais e histórico de situação;
  - partidos dos deputados em exercício.
- O que fica guardado, nas tabelas que já existem (`modelo-dados-base`):
  - político com nome civil, nome parlamentar, data de nascimento e endereço da foto oficial; identificador da Câmara em `politician_external_ids`;
  - CPF só em `restricted.politician_private_ids`, nunca exibido (DDR §10.1), para ligar a Câmara ao TSE e ao Senado depois;
  - partido (sigla e nome da Câmara) e a filiação atual do deputado;
  - mandato de deputado federal na Câmara, pela UF, na legislatura 57, com início, situação (titular, suplente ou licenciado) e fim quando o deputado sai do exercício.
- Atualização: quem sai do exercício tem o mandato encerrado; quem troca de partido tem a filiação anterior encerrada e uma nova aberta. Rodar de novo não duplica nada.
- Validações antes de publicar e testes com respostas reais gravadas da API (sem rede).

Requisitos do DDR cobertos: RF-03 (dados da bancada federal), RF-09 (foto, sigla do partido; a tela vem depois), RNF-06, RNF-09, RNF-16, §6.1 (Câmara), §6.2 (identidade única), §10.1 (CPF restrito).

Fora de escopo:
- Telas (`busca-geografica`, `perfil-do-politico`).
- Cores e logos de partidos (`identidade-de-partidos-e-ufs`).
- Despesas, votações e proposições (changes próprias).
- Histórico de filiações anteriores à coleta: o histórico da Câmara mistura legislaturas e datas de início de legislatura, então só a filiação atual é registrada, e as trocas passam a ser registradas a partir da primeira coleta.
- Guardar a foto no Cobra: fica o endereço oficial; servir a foto pelo próprio site entra com a tela de perfil, junto com a regra de privacidade do mapa.
- Agendamento automático (entra com o deploy).

## Capabilities

### New Capabilities

- `deputados-federais`: quais dados de deputados federais o Cobra guarda, de onde vêm, como são atualizados e quais regras valem antes de publicar.

### Modified Capabilities

(nenhuma: as regras do cadastro em `cadastro-de-representantes` continuam valendo como estão, e a Câmara já está na lista de fontes.)

## Impact

- Novo adaptador `collectors/src/cobra_collectors/sources/camara.py`, registrado no `REGISTRY`.
- Amostras reais da API em `collectors/tests/fixtures/camara/`, com o CPF trocado por um valor fictício.
- Pode precisar de uma migração pequena (por exemplo, índice ou coluna de apoio); se não precisar, nenhuma.
- `docs/coleta.md` ganha a seção da Câmara.
