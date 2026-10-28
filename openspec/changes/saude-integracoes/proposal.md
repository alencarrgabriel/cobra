# Saúde das integrações

## Why

O DDR pede um painel de saúde das integrações, com última coleta, falhas e volume (RF-66). Pede também observabilidade com alertas de falha para a equipe (RNF-17) e "alerta após falhas seguidas" na fila (§6). O coletor já registra cada execução em `ops.runs` e cada tarefa em `ops.jobs`, mas ninguém vê esses dados fora do banco.

## What Changes

- **`/painel/saude`**, só para editores. Para cada fonte:
  - **última execução**: início, fim, situação, tarefas feitas e falhas;
  - **último sucesso**;
  - **fila**: tarefas na fila, rodando e com falha;
  - **falhas**: as dos últimos 7 dias, com o erro;
  - **volume**: respostas brutas guardadas por dia nos últimos 7 dias;
  - **situação calculada**:
    - "em dia";
    - "atrasada", quando o último sucesso passou da meta da fonte;
    - "com falha", quando a última execução falhou ou há tarefas falhando;
    - "sem coleta".
- **Metas por fonte**, as do DDR:
  - Câmara e Senado: 6 h para votações e 1 dia para o resto, então o painel usa 1 dia;
  - Obrasgov, Transparência e CLDF: 1 dia;
  - TSE e IBGE: 30 dias, porque o TSE atualiza a cada publicação.
- **Alerta para a equipe**: a manutenção diária (`/api/manutencao/diaria`) calcula a saúde. Se alguma fonte estiver "com falha" ou "atrasada", envia um e-mail para `OPS_ALERT_EMAIL`, um por dia no máximo. Sem essa variável, só registra no log.
- **Fora de escopo**:
  - Sentry ou outro serviço de monitoramento externo, que exige conta e decisão de custo;
  - o agendamento das coletas na hospedagem, que depende da escolha do ambiente de produção.

## Capabilities

### New Capabilities
- `saude-integracoes`: painel de saúde por fonte e alerta de falha para a equipe.

### Modified Capabilities
- (nenhuma)

## Impact

- **Migração**:
  - leitura de `ops.runs` e `ops.jobs` para `cobra_editor`;
  - leitura de algumas colunas de `raw.responses` (fonte, data e status, sem o corpo);
  - tabela `ops.alerts_sent`, para não repetir o alerta no mesmo dia.
- **`web`**:
  - `lib/health` (consulta e regra de situação, com Vitest);
  - a página do painel;
  - o alerta na manutenção diária;
  - a variável `OPS_ALERT_EMAIL`.
- **Testes**: banco, Vitest e Playwright.
