# Saúde das integrações

Painel e alerta de falha das coletas (change `saude-integracoes`; DDR RF-66 e RNF-17).

## Painel

`/painel/saude`, só para editores (login com segundo fator). Para cada fonte, em ordem alfabética:

- situação: **em dia**, **atrasada** (último sucesso mais antigo que a meta), **com falha** (última execução falhou ou há tarefas com falha nos últimos 7 dias) ou **sem coleta**;
- última execução (quando, situação, tarefas feitas e com falha) e último sucesso;
- fila: na fila, rodando, com falha;
- respostas brutas guardadas nos últimos 7 dias.

Abaixo, as últimas 20 falhas da semana com o erro. Metas: 1 dia para Câmara, Senado, CLDF, Obrasgov.br e Portal da Transparência; 30 dias para TSE e IBGE (o TSE publica de tempos em tempos).

Os dados vêm de `ops.runs`, `ops.jobs` e dos metadados de `raw.responses` (fonte, data e status; nunca o corpo), lidos pelo papel `cobra_editor`.

## Alerta para a equipe

A manutenção diária (`/api/manutencao/diaria`, com `CRON_SECRET`) calcula a saúde. Se alguma fonte estiver com falha ou atrasada, envia um e-mail para `OPS_ALERT_EMAIL`, no máximo um por dia (`ops.alerts_sent`). Sem `OPS_ALERT_EMAIL`, registra no log em nível `warn`.

## Agendamento em produção

O agendamento ainda depende da escolha da hospedagem. O que precisa rodar:

| O quê          | Quando                                                                                                | Como                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Coletas        | Todo dia, fora de horários redondos (o Senado pede); votações a cada poucas horas, para a meta de 6 h | `uv run cobra-collect enqueue <fonte> <tarefa>` e `uv run cobra-collect work` (ver docs/coleta.md) |
| Manutenção     | Todo dia                                                                                              | `curl -X POST -H "Authorization: Bearer $CRON_SECRET" <site>/api/manutencao/diaria`                |
| Resumo semanal | Todo dia (cada execução envia só a quem falta)                                                        | `curl -X POST -H "Authorization: Bearer $CRON_SECRET" <site>/api/alertas/resumo-semanal`           |
