# Reporte de erro e contestação

## Why

O DDR pede um canal para reportar erro em qualquer dado, com fila de correção pública (RF-64), e o link "É você nesta página?" em todo perfil, levando ao canal de contestação e direito de resposta, com prazo de resposta definido (RF-59, §10.5). A correção é pública: "registro visível do que mudou e quando" (§9.1).

Decisões de 2026-10-28:
- só formulário, sem e-mail público;
- prazo de resposta de **5 dias úteis**;
- e-mail de quem reporta é **opcional**, cifrado, usado só para responder aquele reporte e apagado 90 dias depois do fechamento.

## What Changes

- **Formulário `/reportar`**: página do dado (preenchida pelo link de origem), tipo e descrição.
  - O tipo é "erro num dado" ou "sou a pessoa desta página e quero contestar".
  - O e-mail é opcional, com o aviso do uso e da exclusão.
  - Quem envia recebe um número de protocolo e o prazo.
- **Fila pública `/correcoes`**: cada reporte com protocolo, página, tipo, data, prazo, situação e a nota pública da equipe.
  - Não mostra a descrição nem o e-mail de quem reportou.
  - Cada reporte tem sua página, `/correcoes/<protocolo>`.
- **Links**: "Reportar erro" no rodapé, na votação, na obra e no perfil. "É você nesta página?" em todo perfil.
- **Painel**: `/painel/reportes`, com os reportes abertos, prazo primeiro.
  - O editor muda a situação e escreve a nota pública. Ao fechar, a nota é obrigatória, e o editor pode responder por e-mail.
  - Cada mudança fica num histórico que não pode ser apagado.
- **Proteção**:
  - o site grava reportes por um papel que só insere;
  - campo-isca contra robôs;
  - limite de reportes por dia;
  - o e-mail é apagado 90 dias depois do fechamento por uma rota de manutenção diária.
- **Metodologia**: seção "Correções", com o prazo e como funciona a fila.

## Capabilities

### New Capabilities
- `reporte-de-erro`: formulário, protocolo, prazo, fila pública, triagem no painel, resposta e exclusão do e-mail.

### Modified Capabilities
- `perfil-do-politico`: link "É você nesta página?".

## Impact

- **Migração**:
  - schema `reports` (reportes e histórico);
  - visão `core.public_reports`, que o site lê;
  - papel `cobra_reports`, só inserção, por `REPORTS_DATABASE_URL`;
  - privilégios do `cobra_editor` sobre os reportes.
- **`web`**:
  - páginas `/reportar` e `/correcoes`, e as do painel;
  - rota `/api/manutencao/diaria` (protegida por `CRON_SECRET`);
  - o e-mail cifrado com a chave de `ALERTS_SECRET`.
- **Testes**: banco e Playwright.
