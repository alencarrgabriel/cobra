# Reporte de erro e correções

Canal de reporte de erro e de contestação (change `reporte-de-erro`; DDR RF-59, RF-64, §9.1 e §10.5). Decisões de 2026-10-28: só formulário, prazo de 5 dias úteis, e-mail opcional apagado 90 dias depois do fechamento.

## Como funciona

1. Qualquer pessoa abre `/reportar`, pelo rodapé, pelo link "Reportar erro nesta página" (votação, obra, perfil) ou por "É você nesta página?" no perfil (contestação).
2. O envio devolve o protocolo (o número do reporte) e a data-limite: 5 dias úteis, de segunda a sexta, sem contar feriados.
3. O reporte entra na fila pública `/correcoes`, com protocolo, página, tipo, situação, prazo e a nota da equipe. A descrição e o e-mail não são publicados.
4. Editores analisam em `/painel/reportes`: mudam a situação, escrevem a nota pública (obrigatória para fechar) e, se a pessoa deixou e-mail, respondem por ele. Cada passo fica em `reports.history`.

Situações: recebido, em análise, corrigido, sem alteração (o dado confere com a fonte). Prazo vencido sem resposta aparece como "prazo vencido em dd/mm/aaaa".

## Páginas aceitas

Só endereços de páginas públicas de dados, na forma canônica (`/politicos/<id>`, `/votacoes/<id>`, `/obras/<código>`, `/planos/<id>`, `/representantes/<código>`, `/metodologia`…). Qualquer outro endereço vira "o Cobra em geral", para a fila pública nunca mostrar um link privado (como o de "Meus dados") nem texto livre num endereço.

## Proteção

- O formulário grava pelo papel `cobra_reports` (`REPORTS_DATABASE_URL`), que só insere e conta os reportes do dia (até 200 por dia); não lê descrição nem e-mail.
- O site público lê só a visão `core.public_reports`.
- O e-mail é cifrado com a chave de `ALERTS_SECRET` (AES-256-GCM). Sem `ALERTS_SECRET`, o campo de e-mail não aparece.
- Campo-isca contra robôs.

## Manutenção diária

`GET` ou `POST /api/manutencao/diaria` com `Authorization: Bearer <CRON_SECRET>` apaga o e-mail dos reportes fechados há mais de 90 dias. Agende junto com o resumo semanal, todo dia.
