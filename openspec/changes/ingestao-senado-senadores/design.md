# Design

## Context

Mesma base do adaptador da Câmara (`ingestao-camara-deputados`): fila, cliente HTTP com limite, armazenamento bruto e as tabelas do cadastro (`politicians`, `politician_external_ids`, `parties`, `party_affiliations`, `mandates`).

API conferida em 2026-10-26 (`https://legis.senado.leg.br/dadosabertos`, OpenAPI 4.1.3.106 em `/v3/api-docs`, respostas em JSON com `Accept: application/json`):
- `GET /senador/lista/atual`: os 81 em exercício. Cada item traz identificação (código, nome, nome completo, foto, sigla do partido, UF) e o mandato:
  - código do mandato;
  - primeira e segunda legislatura com datas;
  - participação ("Titular", "1º Suplente"…);
  - suplentes;
  - períodos de exercício (`Exercicios`), com início e, se encerrado, fim e causa.
- `GET /senador/afastados`: senadores fora de exercício (44 hoje), com o mesmo formato. Redireciona para `/dados/AfastamentoAtual.json`.
- `GET /senador/{codigo}`: data de nascimento.
- `GET /senador/{codigo}/filiacoes`: histórico de filiações com `DataFiliacao` e `DataDesfiliacao`.
- Limite oficial: mais de 10 requisições por segundo podem receber 429; em picos, 503. A documentação pede para evitar rotinas em horários redondos.
- Nenhum desses serviços está marcado como depreciado.
- Não há CPF.

## Goals / Non-Goals

**Goals:** 81 senadores em exercício, licença e saída corretas, histórico de filiações com datas, identidade única com quem já está no banco.

**Non-Goals:** mandatos passados, votações, discursos, despesas, cores de partido, telas.

## Decisions

### D1. Tarefas
- `senado/senators` (dedupe `run`): busca as duas listas.
  - Enfileira um `senado/senator` para cada senador em exercício, com os dados do mandato no payload: o detalhe não repete o mandato, e assim cada senador custa só duas requisições.
  - Depois trata os mandatos abertos de quem não está em exercício (D4). As duas listas são obtidas antes de qualquer escrita; se uma falhar, a tarefa falha sem mexer em nada.
- `senado/senator` (dedupe `<código>`): `GET /senador/{codigo}` e `GET /senador/{codigo}/filiacoes`. Publica político, id, partidos, filiações e mandato numa transação.
- Limite: 8 req/s, rajada 4. Uma carga completa tem cerca de 164 requisições.

### D2. Normalização (`senado_model.py`)
- Político:
  - `NomeCompletoParlamentar` como nome civil e `NomeParlamentar` como nome parlamentar;
  - `DataNascimento` do detalhe e `UrlFotoParlamentar`;
  - fonte `senado`, `source_id` = código do parlamentar, `source_url` = URL do detalhe.
- UF: `Mandato.UfParlamentar`, convertida no código IBGE. Sigla desconhecida bloqueia o senador.
- Participação: "Titular" → `titular`; qualquer "Nº Suplente" → `suplente`. Outra coisa bloqueia o senador.
- Respostas com um único item vêm como objeto, não como lista; a normalização trata os dois casos.

### D3. Mandato
- Legislatura: número da `PrimeiraLegislaturaDoMandato`. O mandato de senador cobre duas legislaturas.
- Início:
  - titular: `DataInicio` da primeira legislatura do mandato;
  - suplente: `DataInicio` do período de exercício aberto (sem `DataFim`) mais recente.
- `source_id`: `<código>-<código do mandato>-<início>`. Um suplente com dois períodos de exercício tem dois mandatos.
- Outro mandato aberto do mesmo político no Senado, com outro `source_id`, é encerrado na véspera do novo início (como na Câmara).

### D4. Quem não está em exercício
Para cada mandato aberto de senador da fonte `senado` cujo código não está na lista atual:
- se o código aparece entre os afastados como titular: o mandato continua aberto, com situação `licenciado`;
- se aparece como suplente: o mandato é encerrado na `DataFim` do período de exercício correspondente (o de mesmo início), ou, sem ela, na `DataFim` mais recente;
- se não aparece em nenhuma das duas listas: o mandato é encerrado na data da coleta, e a tarefa registra que a data é aproximada.

### D5. Filiações
- Cada item de `/filiacoes` vira uma linha:
  - `source_id` = `<código>:<código do partido>:<data de filiação>`;
  - `started_on` = `DataFiliacao`;
  - `ended_on` = `DataDesfiliacao`.
- Partido por sigla: se a sigla já existe (vinda da Câmara, por exemplo), reaproveita; senão cria, com o código e o nome do Senado.
- Linhas incoerentes (fim antes do início) ou uma segunda filiação aberta são descartadas com aviso, sem bloquear o senador. Fica valendo a de filiação mais recente.
- "S/Partido": nenhuma filiação aberta, como o histórico já mostra.
- Quando o senador foi ligado a um político de outra fonte (D6), as filiações do Senado só são gravadas se esse político não tiver filiação aberta de outra fonte. Hoje nenhum senador em exercício está nesse caso; a regra evita duas fontes disputando a filiação aberta.

### D6. Identidade única
- Antes de criar o político, procura pelo identificador do Senado.
- Sem esse identificador, procura um político de outra fonte com a mesma data de nascimento e o mesmo nome civil normalizado (sem acento, maiúsculas, espaços simples).
- Exatamente um resultado: liga o código do Senado a ele. Nenhum ou mais de um: cria um político novo e registra o caso no log.
- Os campos exibidos (nome, foto) só são atualizados pelo Senado quando o registro tem fonte `senado`.

### D7. Testes
- Respostas reais gravadas:
  - lista atual e afastados, reduzidas a um conjunto pequeno: os 3 do DF, um suplente em exercício, um titular afastado e um suplente que voltou à suplência;
  - detalhe e filiações desses senadores.
- Testes sem banco: normalização e regras de início e saída.
- Testes com banco:
  - carga completa e segunda carga igual;
  - titular afastado e suplente que saiu;
  - lista de afastados indisponível;
  - troca de partido com datas;
  - ligação com político já cadastrado pela Câmara;
  - UF desconhecida.

## Risks / Trade-offs

- [Nome civil escrito diferente entre Câmara e Senado] → A ligação exige nome e data de nascimento iguais; em caso de dúvida, cria outro político. O TSE (com CPF) vai consolidar depois.
- [Sigla reaproveitada por partidos diferentes no tempo] → O histórico do Senado traz partidos extintos (DEM, PSL). Partidos são casados por sigla; a identidade completa vem em `identidade-de-partidos-e-ufs`.
- [Formato que muda de objeto para lista] → Tratado na normalização e testado com amostra de item único.

## Migration Plan

Sem migração. Primeira carga manual pela CLI, conferida contra a API (81 senadores, 3 por UF).
