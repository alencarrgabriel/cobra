# Resumo semanal por e-mail

## Why

O cadastro de alertas já existe (change `alertas-cadastro`), mas nada é enviado. O DDR pede um resumo semanal por e-mail com os principais eventos dos representantes (RF-51), descadastro em um clique em toda mensagem (RF-52) e o histórico de envios (entidade EnvioDeAlerta, §8). Os políticos seguidos entram no resumo, pela decisão de 2026-10-27.

## What Changes

- **Resumo**: para cada inscrição ativa, as votações relevantes da semana anterior (segunda a domingo), da mais recente para a mais antiga, até 15. Cada uma traz:
  - data, casa, proposição, resultado e placar oficial;
  - como votou cada representante do estado informado e cada político seguido, incluindo "Não registrou voto";
  - link para a página da votação e a fonte.
- **Sem eventos, sem e-mail**: semana sem votação relevante não gera mensagem.
- **Descadastro**: toda mensagem tem o link de saída e os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post` (one-click).
- **Histórico de envios**: um registro por inscrição e semana, com as votações incluídas e o resultado do envio. Ele impede envio duplicado, aparece em "Meus dados" e some quando a pessoa apaga os dados.
- **Disparo**: rota `/api/alertas/resumo-semanal`, protegida por `CRON_SECRET`, pensada para rodar todo dia.
  - Cada execução envia só a quem ainda não recebeu o resumo daquela semana e para no limite diário (`ALERTS_DAILY_CAP`).
  - Assim, se as inscrições passarem do limite, o restante sai nos dias seguintes.
- **Envio**: respeita o limite do Resend (10 pedidos por segundo) e tenta de novo uma vez depois de um 429.

## Fora de escopo

- Presença e gastos no resumo (o feed os inclui só na Fase 2, DDR §3), WhatsApp, alerta imediato e escolha de frequência.
- Agendar o disparo na hospedagem: fica para quando o ambiente de produção for definido (change `saude-integracoes`).

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- `alertas`: resumo semanal, descadastro em toda mensagem e histórico de envios.

## Impact

- **Migração**: `alerts.deliveries`.
- **`web`**:
  - `lib/alerts/digest.ts` (montagem e envio);
  - rota `/api/alertas/resumo-semanal`;
  - o histórico de envios em "Meus dados" e na exportação;
  - a variável `CRON_SECRET`.
- **Testes**: Vitest do texto e da semana; Playwright do disparo, lendo a caixa de saída local.
