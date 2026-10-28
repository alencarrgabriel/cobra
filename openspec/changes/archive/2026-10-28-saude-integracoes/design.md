# Design

## Context

O coletor grava:
- `ops.runs`: uma linha por execução do `work`, com fonte, início, fim, situação (`ok`, `partial` ou `failed`) e o número de tarefas feitas e com falha;
- `ops.jobs`: a fila, com situação, tentativas e `last_error`;
- `raw.responses`: cada resposta bruta, com fonte e data.

O painel editorial já tem login com segundo fator, e o papel `cobra_editor` só lê `core` e `editorial`.

## Decisions

### D1. Acesso
- O painel fica no `/painel`, porque o RF-66 é ferramenta da equipe. O público já vê a última coleta de cada fonte na metodologia.
- A migração dá a `cobra_editor`:
  - select em `ops.runs` e `ops.jobs`;
  - select das colunas `source`, `fetched_at` e `status_code` de `raw.responses`. O corpo das respostas e os arquivos não entram.
- `ops.alerts_sent(day date primary key, sent_at, sources text[])`, com insert para `cobra_editor`.

### D2. Situação de cada fonte
`healthOf(source, now)`, pura e testada:
- **"sem coleta"**: nenhuma execução registrada.
- **"com falha"**: a última execução terminou `failed`, ou há tarefas em `failed` criadas nos últimos 7 dias.
- **"atrasada"**: o último `ok` ou `partial` é mais antigo que a meta da fonte.
- **"em dia"**: nos outros casos.
- **Metas**:
  - `camara`, `senado`, `obrasgov`, `transparencia`, `cldf`: 1 dia;
  - `tse`, `ibge`: 30 dias.
- **Ordem do painel**: as fontes em ordem alfabética, todas com o mesmo destaque. A situação vem em texto, com ícone e cor dos tokens de status já existentes (`--work-stop`, `--work-done`), nunca só cor.

### D3. Painel `/painel/saude`
- **Tabela por fonte**:
  - situação;
  - última execução: quando, situação, feitas e falhas;
  - último sucesso;
  - fila: na fila, rodando e com falha;
  - respostas brutas nos últimos 7 dias.
- **Falhas recentes**: até 20, das mais novas para as mais antigas, com fonte, tipo, tentativas, quando e o erro, cortado em 300 caracteres.
- **Link** na página inicial do painel.

### D4. Alerta para a equipe
- Na manutenção diária, depois da exclusão dos e-mails vencidos: se houver fontes "com falha" ou "atrasadas" e ainda não houver linha em `ops.alerts_sent` para o dia, envia por `sendMail` para `OPS_ALERT_EMAIL`. A mensagem lista as fontes, as situações e o link do painel, e o dia fica registrado.
- Sem `OPS_ALERT_EMAIL`, registra no log em nível `warn`.
- A resposta da rota passa a trazer também a lista de fontes com problema.

### D5. Testes
- **Vitest**: `healthOf` em cada situação, com as metas.
- **Banco**: o editor lê `ops.runs` e só as colunas permitidas de `raw.responses`; o site não lê `ops`.
- **Playwright**, com execuções e falhas gravadas no seed do teste:
  - o painel mostra "com falha", "atrasada" e "em dia";
  - a manutenção envia o alerta uma vez por dia para a caixa de saída local.
