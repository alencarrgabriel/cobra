# Design

## Context

O site lê o banco como `cobra_web_reader` (somente leitura) e o painel grava como `cobra_editor`. Os dados de quem se cadastra são de outra natureza: são pessoais, e os seguidos são sensíveis. Ficam num schema próprio, acessado por um papel próprio, e cifrados pela aplicação. Quem tem acesso ao banco, ou a um backup dele, não lê o e-mail nem os seguidos sem a chave.

O Resend foi conferido na documentação oficial em 2026-10-27:
- envio por `POST https://api.resend.com/emails`, com `Authorization: Bearer`;
- `Idempotency-Key` por pedido, válida por 24 h;
- limite de 10 pedidos por segundo, com 429 quando passa;
- cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click`;
- plano gratuito com 3.000 e-mails por mês e 100 por dia.

## Decisions

### D1. Criptografia
- `ALERTS_SECRET` (32 bytes aleatórios em base64, só no servidor) gera, por HKDF-SHA256, duas chaves com rótulos distintos: uma de cifra e uma de busca.
- **Cifra**: AES-256-GCM com nonce aleatório de 12 bytes, guardado como `nonce ‖ texto cifrado ‖ tag`. Vale para:
  - o e-mail (`email_enc`);
  - as preferências (`prefs_enc`), um JSON `{ uf, follows: [ids] }`, em que `uf` é o código IBGE do estado ou `null`.
- **Busca**: `email_lookup` = HMAC-SHA256 do e-mail normalizado (minúsculas, sem espaços). É único na tabela.
- **Tokens**: 32 bytes aleatórios em base64url; só o SHA-256 fica no banco.
- **Saída**: o token de descadastro é o HMAC do id da inscrição, então não precisa ser guardado e nunca expira.
- A change `resumo-semanal` decifra com a mesma chave, no coletor.

### D2. Banco
- `alerts.subscriptions` guarda:
  - `id` (uuid), `email_lookup`, `email_enc`, `prefs_enc`;
  - `status`, que pode ser `pendente`, `ativa` ou `cancelada`;
  - `email_consent_version` e `email_consent_at`;
  - `follows_consent_version` e `follows_consent_at`;
  - `created_at`.
- `alerts.links` guarda os links pedidos: `token_hash`, `subscription_id`, `purpose`, `payload_enc`, `expires_at` e `used_at`.
  - `purpose` é `confirmar` ou `meus_dados`.
  - `payload_enc` é o que a confirmação aplica: lugar, seguido novo e consentimentos.
  - O link de confirmação vale 48 h e uma vez só. O de meus dados vale várias vezes durante 1 h, para as ações daquela visita.
- `alerts.access_log` guarda `at`, `subscription_id` e `action`.
  - `action` é `cadastro`, `confirmacao`, `link_meus_dados`, `acesso`, `exportacao`, `correcao`, `deixou_de_seguir`, `descadastro` ou `exclusao`.
  - É append-only e nunca guarda o e-mail.
  - Na exclusão, a inscrição e os links são apagados. O registro fica, com um uuid que não aponta mais para ninguém.
- `alerts.outbox_local` guarda o destinatário, o assunto, o texto e a data. Só é usada sem `RESEND_API_KEY` e fora de produção, para desenvolvimento e testes: o site não grava nela em produção.
- Papel `cobra_alerts`, sem login (o deploy cria o usuário), conectado por `ALERTS_DATABASE_URL`, só no servidor:
  - select, insert, update e delete em `subscriptions` e `links`;
  - insert em `access_log` e `outbox_local`;
  - select em `core.politicians`, para o nome de quem é seguido.
- `cobra_web_reader` não tem uso do schema `alerts`.

### D3. Fluxos
- **Cadastro e seguir**:
  1. O formulário em `/alertas` pede o e-mail, o estado (opcional) e a caixa do resumo semanal, que é obrigatória. Com `?seguir=<id>`, mostra quem será seguido e uma segunda caixa, separada e destacada: "Guardar os políticos que eu sigo. Isso pode indicar minha opinião política, que é dado sensível."
  2. Enviar cria a inscrição `pendente`, se ela ainda não existir, e um link de `confirmar` com o pedido cifrado.
  3. A resposta é sempre "Se o endereço puder receber, enviamos um link para confirmar".
- **Confirmar**: `/alertas/confirmar?t=` mostra o que será confirmado e um botão; o POST aplica o pedido.
  - O botão existe porque leitores de e-mail abrem links sozinhos.
  - Aplicar ativa a inscrição, registra os consentimentos com versão e data, junta o seguido aos que já existem e grava o estado.
- **Meus dados**:
  - `/alertas/meus-dados` pede o e-mail e envia um link, com a mesma resposta neutra.
  - `/alertas/meus-dados/<t>` mostra o e-mail, o estado, os seguidos com nome, o status e as datas dos consentimentos.
  - Dali dá para baixar o JSON, mudar o estado, deixar de seguir, cancelar o resumo e apagar tudo, este último com confirmação.
  - Cada ação de POST revalida o token e registra no log.
- **Saída**: `/alertas/sair/<t>`. GET mostra um botão; POST cancela e devolve 200. Funciona sem JavaScript, e o POST responde também ao one-click dos provedores de e-mail.
- **Limites**:
  - no máximo 3 links por endereço por hora;
  - no máximo `ALERTS_DAILY_CAP` e-mails por dia no total, 80 por padrão, abaixo dos 100 do plano gratuito;
  - acima do limite, a mesma resposta neutra, sem envio;
  - campo-isca escondido no formulário: preenchido, nada é enviado.

### D4. Envio
- `lib/alerts/mail.ts`:
  - com `RESEND_API_KEY`, faz `fetch` para a API, com `Idempotency-Key` igual ao hash do link e timeout de 10 s;
  - sem a chave, fora de produção, grava em `outbox_local`;
  - em produção sem a chave, `/alertas` diz que o cadastro está indisponível.
- **Mensagem**: só texto, em pt-BR, com remetente `ALERTS_FROM` (por exemplo, `Cobra <alertas@dominio>`), o link e o aviso "se não foi você, ignore".
- O link de saída e os cabeçalhos de descadastro entram nas mensagens do resumo semanal, na change seguinte. Mensagens de confirmação não precisam deles.

### D5. Interface
- **Botão "Seguir"** no cabeçalho do perfil: é um link para `/alertas?seguir=<id>`, porque o site não sabe quem está seguindo nem guarda nada no navegador.
- **Rodapé**: links para "Alertas" e "Privacidade".
- **Estado**: lista das 27 UFs, opcional; vem pré-selecionada com a UF do lugar lembrado no aparelho (`readRememberedPlace`). Coleta mínima: a UF basta para deputados federais e senadores, e o município não é guardado.
- **`/privacidade`**: o que é guardado (e-mail, estado, seguidos), para quê (o resumo semanal), a base legal (consentimento, e consentimento específico para os seguidos), a cifra, como ver, exportar e apagar, o que nunca é feito (§10.2) e que o encarregado ainda vai ser nomeado.
- Páginas de token com `noindex` e `Referrer-Policy: no-referrer`.

### D6. Testes
- **Vitest**:
  - a cifra vai e volta;
  - o HMAC é estável para o mesmo e-mail, com maiúsculas e espaços diferentes;
  - um token adulterado falha.
- **Banco**: o papel do site não lê `alerts`; o papel dos alertas não altera nem apaga o log.
- **Playwright**, lendo os links em `outbox_local`:
  - cadastro com confirmação;
  - seguir a partir do perfil, com consentimento separado;
  - resposta neutra para endereço repetido;
  - meus dados: ver, exportar, mudar o estado, deixar de seguir, apagar;
  - saída em um clique;
  - link usado ou vencido recusado;
  - axe.
