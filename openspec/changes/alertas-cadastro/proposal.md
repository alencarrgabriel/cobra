# Alertas: cadastro e seguir políticos

## Why

O MVP tem alertas por e-mail com resumo semanal (RF-50 a RF-52) e o botão "Seguir" (RF-30, que exige conta ou contato verificado). Os políticos seguidos podem revelar opinião política, que é dado sensível (DDR §10.2): pedem consentimento específico e destacado, criptografia em repouso, registro de acessos e direitos do titular pelo próprio site. Decisões de 2026-10-27: envio pelo Resend; "Seguir" usa o mesmo e-mail verificado dos alertas; a lista de seguidos fica no servidor, junto do e-mail. O envio do resumo semanal vem na change seguinte (`resumo-semanal`).

## What Changes

- **Cadastro em `/alertas`**: e-mail, estado (opcional, pré-preenchido com o estado do lugar lembrado; basta para os representantes federais) e consentimento para receber o resumo semanal. Opt-in duplo: nada vale até a pessoa abrir o link enviado por e-mail.
- **Seguir**: botão "Seguir" no perfil leva a `/alertas?seguir=<id>`. Salvar seguidos pede um segundo consentimento, separado e destacado. A confirmação também é pelo link enviado por e-mail.
- **Meus dados**: a pessoa pede, pelo e-mail, um link temporário. Com ele, vê os dados, exporta em JSON, corrige o estado, deixa de seguir, cancela o resumo e apaga tudo.
- **Descadastro em um clique**: link permanente de saída, aceito por GET (página com botão) e POST (`List-Unsubscribe-Post`).
- **Proteção**:
  - e-mail, estado e seguidos são cifrados no servidor (AES-256-GCM);
  - o e-mail é localizado por HMAC, nunca guardado em texto;
  - a resposta é a mesma exista ou não o endereço;
  - os envios têm limite por endereço e por dia (o plano gratuito do Resend tem 100 e-mails por dia).
- **Registro de acessos**: cada cadastro, confirmação, acesso, exportação, correção, descadastro e exclusão fica registrado, sem o e-mail.
- **Privacidade**: página `/privacidade` em linguagem simples, com o que é guardado, para quê e como apagar.

## Fora de escopo

- O envio do resumo semanal (change `resumo-semanal`), WhatsApp, alerta imediato e preferências de frequência e temas (Fase 2).
- Nomear o encarregado (DPO): decisão do projeto antes do lançamento público. A página de privacidade diz que ele ainda vai ser nomeado.

## Capabilities

### New Capabilities
- `alertas`: cadastro com opt-in duplo, seguir com consentimento específico, meus dados, descadastro e proteção dos dados.

### Modified Capabilities
- `perfil-do-politico`: botão "Seguir".

## Impact

- **Migração**: schema `alerts` (inscrições, registro de acessos e caixa de saída local) e papel `cobra_alerts`, que o site lê por `ALERTS_DATABASE_URL`. O papel do site (`cobra_web_reader`) não acessa `alerts`.
- **`web`**:
  - páginas `/alertas/**` e `/privacidade`;
  - ações de servidor e envio pela API do Resend (`fetch`, sem SDK);
  - variáveis `RESEND_API_KEY`, `ALERTS_FROM`, `ALERTS_SECRET`, `ALERTS_DATABASE_URL` e `ALERTS_DAILY_CAP`.
- **Testes**: sem `RESEND_API_KEY` e fora de produção, a mensagem vai para a caixa de saída local, e os testes Playwright leem o link de lá.
