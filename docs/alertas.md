# Alertas por e-mail

Cadastro, "Seguir" e direitos do titular (change `alertas-cadastro`). O envio do resumo semanal vem na change `resumo-semanal`.

## Como funciona

1. A pessoa informa o e-mail em `/alertas` (ou pelo botão "Seguir" de um perfil) e marca a autorização. Seguir pede uma segunda autorização, separada, porque os seguidos podem indicar opinião política (DDR §10.2).
2. O site envia um link de confirmação (48 h, uma vez). Nada vale antes disso.
3. Em `/alertas/meus-dados` a pessoa pede um link (1 h) para ver, baixar em JSON, corrigir o estado, deixar de seguir, cancelar e apagar tudo.
4. Toda mensagem do resumo traz o link de saída permanente `/alertas/sair/<token>`; o one-click dos provedores faz POST em `/alertas/sair/<token>/um-clique`.

A resposta a cadastro e a pedido de link é sempre a mesma, exista ou não o endereço.

## Proteção

- E-mail e preferências (estado e seguidos) ficam cifrados com AES-256-GCM; o e-mail é encontrado por HMAC-SHA256. As duas chaves saem de `ALERTS_SECRET` por HKDF.
- **Perder ou trocar `ALERTS_SECRET` torna todas as inscrições ilegíveis.** Guarde-a no gerenciador de segredos da hospedagem, com cópia segura.
- O site lê esses dados só pelo papel `cobra_alerts` (`ALERTS_DATABASE_URL`); o papel do site público não tem acesso.
- `alerts.access_log` registra cada ação sem o e-mail; o papel dos alertas não altera nem apaga o registro.

## Limites de envio

- No máximo 3 links por endereço por hora.
- No máximo `ALERTS_DAILY_CAP` e-mails por dia (80 por padrão). O plano gratuito do Resend envia 100 por dia e 3.000 por mês; o Pro (US$ 20/mês, conferido em 2026-10-27) não tem limite diário.
- A API do Resend aceita 10 pedidos por segundo; cada envio leva `Idempotency-Key`.

## Configuração

| Variável              | Para quê                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `ALERTS_DATABASE_URL` | Conexão do papel `cobra_alerts`                                                                |
| `ALERTS_SECRET`       | 32 bytes aleatórios em base64                                                                  |
| `RESEND_API_KEY`      | Chave da API do Resend; sem ela, fora de produção, as mensagens vão para `alerts.outbox_local` |
| `ALERTS_FROM`         | Remetente num domínio verificado no Resend                                                     |
| `ALERTS_DAILY_CAP`    | Máximo de e-mails por dia                                                                      |

Em produção sem `RESEND_API_KEY`, `/alertas` diz que o cadastro está fora do ar.

## Antes do lançamento público

- Verificar o domínio de envio no Resend (SPF e DKIM).
- Nomear o encarregado (DPO) e citá-lo em `/privacidade`.
