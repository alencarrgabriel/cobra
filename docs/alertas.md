# Alertas por e-mail

Cadastro, "Seguir" e direitos do titular (change `alertas-cadastro`). O resumo semanal vem da change `resumo-semanal`.

## Como funciona

1. A pessoa informa o e-mail em `/alertas` (ou pelo botão "Seguir" de um perfil) e marca a autorização. Seguir pede uma segunda autorização, separada, porque os seguidos podem indicar opinião política (DDR §10.2).
2. O site envia um link de confirmação (48 h, uma vez). Nada vale antes disso.
3. Em `/alertas/meus-dados` a pessoa pede um link (1 h) para ver, baixar em JSON, corrigir o estado, deixar de seguir, cancelar e apagar tudo.
4. Toda mensagem do resumo traz o link de saída permanente `/alertas/sair/<token>`; o one-click dos provedores faz POST em `/alertas/sair/<token>/um-clique`.

A resposta a cadastro e a pedido de link é sempre a mesma, exista ou não o endereço.

## Resumo semanal

- `GET` ou `POST /api/alertas/resumo-semanal` com `Authorization: Bearer <CRON_SECRET>`; sem o segredo configurado, a rota responde 404.
- Agende para rodar **todo dia** (por exemplo, às 8h de Brasília). Cada execução envia a semana anterior (segunda a domingo) a quem ainda não a recebeu e para no limite diário; o restante sai nos dias seguintes. Execuções repetidas não reenviam.
- Conteúdo: até 15 votações relevantes da semana, com o voto dos representantes do estado e dos seguidos, link e fonte. Semana sem votação relevante não gera e-mail.
- Toda mensagem traz o link de saída e os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post` (one-click).
- `alerts.deliveries` guarda um registro por inscrição e semana (votações incluídas e resultado); aparece em "Meus dados" e some com a inscrição.
- Fora de produção, `?semana=AAAA-MM-DD` escolhe a semana. Exemplo local:

  ```sh
  curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/alertas/resumo-semanal?semana=2026-06-10"
  ```

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
| `ALERTS_DAILY_CAP`    | Máximo de e-mails por dia (links e resumos somados)                                            |
| `CRON_SECRET`         | Segredo do disparo do resumo semanal                                                           |

Em produção sem `RESEND_API_KEY`, `/alertas` diz que o cadastro está fora do ar.

## Antes do lançamento público

- Verificar o domínio de envio no Resend (SPF e DKIM).
- Nomear o encarregado (DPO) e citá-lo em `/privacidade`.
