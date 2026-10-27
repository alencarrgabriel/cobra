# Proposal

## Why

O cidadão é representado no Congresso pela bancada federal da sua UF: os deputados, que já estão no banco (`ingestao-camara-deputados`), e os 3 senadores. Sem os senadores, a bancada fica pela metade, e emendas de senadores (`ingestao-emendas`) não teriam a quem ser ligadas. O Senado publica os senadores em exercício numa API aberta, conferida em 2026-10-26: 81 em exercício (70 titulares e 11 suplentes), 3 pelo DF (Damares Alves, Izalci Lucas e Leany Lemos).

## What Changes

- Adaptador `senado` para os coletores, no mesmo modelo do adaptador da Câmara:
  - lista dos senadores em exercício e lista dos afastados (fora de exercício);
  - para cada senador, uma tarefa de detalhe: dados cadastrais e filiações partidárias.
- O que fica guardado, nas tabelas que já existem:
  - político com nome civil, nome parlamentar, data de nascimento e endereço da foto oficial; identificador do Senado em `politician_external_ids`;
  - partidos e o histórico de filiações com as datas informadas pelo Senado. Diferente da Câmara, o Senado informa a data de filiação e de desfiliação;
  - mandato de senador, pela UF, com início, legislatura e situação (titular, suplente ou licenciado).
- Identidade única entre casas: um senador que já está no banco por outra fonte (por exemplo, um ex-deputado) é ligado ao mesmo político, pelo nome civil e pela data de nascimento.
- Licença e saída: titular afastado continua com o mandato aberto, como licenciado; suplente que deixa o exercício tem o mandato encerrado na data informada pelo Senado.
- Testes com respostas reais gravadas da API (sem rede).

Requisitos do DDR cobertos: RF-03 (dados da bancada federal: 3 senadores por UF), RF-09 (foto e sigla do partido; a tela vem depois), RNF-06, RNF-09 (até 10 req/s no Senado), RNF-16, §6.1 (Senado), §6.2 (identidade única).

Fora de escopo:
- Telas.
- Cores e logos de partidos (`identidade-de-partidos-e-ufs`).
- Votações, discursos e despesas.
- Mandatos passados (só os em exercício e os afastados hoje).
- CPF: a API do Senado não informa.
- Agendamento automático (entra com o deploy; a documentação do Senado pede para evitar horários redondos).

## Capabilities

### New Capabilities

- `senadores`: quais dados de senadores o Cobra guarda, de onde vêm, como são atualizados e quais regras valem antes de publicar.

### Modified Capabilities

(nenhuma: as regras do cadastro em `cadastro-de-representantes` continuam valendo, e o Senado já está na lista de fontes.)

## Impact

- Novo adaptador `collectors/src/cobra_collectors/sources/senado.py`, registrado no `REGISTRY`.
- Amostras reais da API em `collectors/tests/fixtures/senado/`.
- Sem migração prevista.
- `docs/coleta.md` ganha a seção do Senado.
