# Design

## Context

O painel editorial já tem login com segundo fator e o papel `cobra_editor`. Os alertas já têm cifra (`lib/alerts/crypto.ts`, chave de `ALERTS_SECRET`) e envio (`sendMail`). O site lê dados públicos como `cobra_web_reader`.

## Decisions

### D1. Banco
- `reports.reports` guarda:
  - `id`, a identidade, que também é o protocolo;
  - `page_path`, até 300 caracteres, começando com `/`;
  - `kind`, que pode ser `erro` ou `contestacao`;
  - `description`, de 20 a 2.000 caracteres;
  - `email_enc` (opcional) e `email_purged_at`;
  - `status`, que pode ser `recebido`, `em_analise`, `corrigido` ou `sem_alteracao`;
  - `public_note`;
  - `created_at`, `due_on`, `closed_at` e `closed_by`.
- `reports.history`, append-only, guarda `report_id`, `at`, `editor`, `status`, `public_note` e `replied` (se houve resposta por e-mail).
- `core.public_reports` (visão) mostra `id`, `page_path`, `kind`, `status`, `public_note`, `created_at`, `due_on` e `closed_at`. O papel do site lê só essa visão. A descrição e o e-mail nunca saem do schema `reports`, porque a descrição pode trazer dados pessoais.
- Papel `cobra_reports`, sem login, por `REPORTS_DATABASE_URL`: insert em `reports.reports`, mais select só das colunas `id` e `created_at`. Isso basta para o protocolo voltar pelo `returning id` e para contar o total do dia. Ele não lê a descrição nem o e-mail, e não altera reportes.
- `cobra_editor`:
  - select e update em `reports.reports`;
  - insert em `reports.history`, sem update nem delete.
- **Exclusão do e-mail**: `email_enc = null` e `email_purged_at = now()` quando `closed_at` passou de 90 dias.

### D2. Prazo
- `due_on` é a data de envio mais 5 dias úteis, de segunda a sexta, no fuso de Brasília. Feriados não entram na conta. `addBusinessDays` é pura e testada.
- A fila mostra "no prazo até dd/mm" ou, se passou sem fechar, "prazo vencido em dd/mm", sem esconder o atraso.

### D3. Formulário `/reportar`
- **Campos**:
  - `pagina`, que vem de `?pagina=`, é validada como caminho do site e mostrada como link;
  - `tipo`, que vem de `?tipo=contestacao` ou é escolhido;
  - a descrição;
  - o e-mail opcional, com o aviso: "Usado só para responder este reporte e apagado 90 dias depois do fechamento."
- Sem `ALERTS_SECRET`, o campo de e-mail não aparece.
- **Proteção**: campo-isca; no máximo 200 reportes por dia no total. Acima disso, a página pede para tentar no dia seguinte.
- **Depois de enviar**: `/reportar/enviado?protocolo=N` mostra o protocolo, o prazo e o link para `/correcoes/N`.
- Contestação usa o mesmo formulário. O texto da página explica o direito de resposta e pede que a pessoa diga o que está errado e qual é a fonte.

### D4. Fila pública
- `/correcoes` lista do mais recente para o mais antigo, 30 por página, com o número de abertos e fechados no topo.
- `/correcoes/<id>` mostra o reporte, com 404 se não existir.
- **Situações, em pt-BR**:
  - recebido;
  - em análise;
  - corrigido;
  - sem alteração: o dado confere com a fonte.
- A nota pública diz o que mudou e quando, ou por que o dado foi mantido.

### D5. Painel
- `/painel/reportes`: os abertos, por prazo; depois os fechados recentes. A página inicial do painel ganha o link.
- `/painel/reportes/<id>`:
  - mostra a descrição e se há e-mail;
  - campos da situação e da nota pública, obrigatória para fechar, com ao menos 20 caracteres;
  - resposta por e-mail opcional, quando há e-mail. Ela é enviada por `sendMail` com o protocolo e a nota.
- Cada salvamento grava em `reports.history`. Fechar preenche `closed_at` e `closed_by`, e reabrir os limpa.

### D6. Manutenção
- `GET` ou `POST /api/manutencao/diaria`, com o mesmo `CRON_SECRET` do resumo, apaga os e-mails vencidos e responde quantos foram apagados.
- Sem `CRON_SECRET`, responde 404.

### D7. Links
- **Rodapé**: "Reportar erro", para `/reportar`.
- **Votação, obra e perfil**: "Reportar erro nesta página", para `/reportar?pagina=<caminho>`.
- **Perfil**: "É você nesta página?", para `/reportar?pagina=<caminho>&tipo=contestacao`.
- **Metodologia**: seção "Correções", em `#correcoes`.

### D8. Testes
- **Vitest**: `addBusinessDays`, incluindo sexta, sábado e virada de mês.
- **Banco**:
  - o site não lê a descrição;
  - `cobra_reports` só insere;
  - o editor não apaga o histórico.
- **Playwright**:
  - reporte com protocolo e prazo;
  - a fila pública sem a descrição;
  - contestação pelo link do perfil;
  - triagem no painel, com nota e resposta na caixa de saída local;
  - a fila mostra corrigido com a nota;
  - a manutenção apaga o e-mail vencido;
  - axe.
