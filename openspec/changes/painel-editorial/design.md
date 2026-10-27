# Design

## Context

O site lê o banco por uma conexão somente leitura (`WEB_DATABASE_URL`, papel `cobra_web_reader`). O Supabase local já tem Auth (GoTrue) com MFA por TOTP, que agora está ligado em `config.toml`. `@supabase/ssr` guarda a sessão em cookies e funciona em Server Components, Server Actions e no Proxy do Next 16.

## Decisions

### D1. Autenticação
- `@supabase/ssr` com a chave publicável (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Senha por `signInWithPassword`; segundo fator por `mfa.enroll` (TOTP, QR code em SVG devolvido pelo Supabase) na primeira vez e `mfa.challenge` + `mfa.verify` depois.
- Exigência: `getAuthenticatorAssuranceLevel()` = `aal2` e e-mail presente em `editorial.editors` com `active = true`. Checado no Proxy (redireciona) e de novo em cada Server Action (o Proxy não é barreira suficiente).
- Cadastro: `[auth] enable_signup = false` (desligar só o de e-mail desliga também o login por e-mail); `web/scripts/add-editor.mjs <email>` cria o usuário pela API de administração (chave secreta, nunca no navegador) e o inclui em `editorial.editors`. Alternativa rejeitada: cadastro aberto com aprovação manual (superfície de ataque sem necessidade).

### D2. Banco
- `editorial.editors(email, name, active, created_at)`.
- `editorial.vote_summaries(id, vote_id, version, text, status in ('rascunho','publicado','substituido'), author, ai_model, created_at, approved_by, approved_at)`: uma versão por gravação; aprovar publica aquela versão e marca a publicada anterior como `substituido`. Índice único: uma publicada por votação.
- `editorial.log(id, at, editor, action in ('rascunho','aprovacao','curadoria','retirada_curadoria'), vote_id, version, detail)`: append-only (sem update nem delete para o papel do editor).
- Schema próprio `editorial` (trabalho editorial não é dado de fonte oficial); o site (`cobra_web_reader`) não tem acesso a ele e lê só a visão `core.published_summaries(vote_id, text, approved_at, ai_model)`.
- Papel `cobra_editor` (sem login; o deploy cria o usuário): select em `core`; insert/update em `editorial.vote_summaries`; insert em `editorial.log`; insert/delete em `vote_curation`. Conexão `EDITOR_DATABASE_URL`, só no servidor.

### D3. Telas
- `/painel/entrar`: e-mail e senha; depois `/painel/codigo` (QR para cadastrar, ou campo de 6 dígitos).
- `/painel`: fila de votações relevantes sem resumo publicado (até 50), com data, casa, proposição e critérios; link para editar.
- `/painel/votacoes/<id>`: dados da votação, placar oficial, orientações, texto (rascunho atual), botões "Salvar rascunho" e "Aprovar e publicar", histórico de versões e curadoria (justificativa de ao menos 20 caracteres).
- Regras do §9.1 lembradas no formulário (fato, fonte, data; sem adjetivos de valor; os dois lados).
- `noindex` em todo o painel.

### D4. Exibição pública
- No "Como votou" do perfil, a votação com resumo publicado mostra o texto e "Resumo revisado por pessoas em <data>". O feed e a página da votação (change 24) usam a mesma visão.

### D5. Testes
- Banco: papéis (site não lê rascunho; editor não apaga log), versão publicada única.
- Playwright: sem sessão, `/painel` leva ao login; login com senha + cadastro do TOTP (código calculado no teste com `otpauth`); salvar e aprovar; o perfil mostra o resumo; a trilha registra o editor.
