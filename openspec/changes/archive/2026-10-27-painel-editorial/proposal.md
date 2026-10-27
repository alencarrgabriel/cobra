# Painel editorial

## Why

O DDR exige que resumos de votações só sejam publicados depois de aprovação humana registrada (RF-62, RF-63, §6) e que o painel tenha login com segundo fator (RNF-11). A relevância já marca as votações que precisam de resumo e prevê a curadoria editorial (change `relevancia-e-eventos`). Decisão de 2026-10-27: login pelo Supabase Auth com app autenticador (TOTP); rascunho por IA vem na change seguinte (`rascunho-ia`).

## What Changes

- **Login de editores** em `/painel/entrar`: e-mail e senha do Supabase Auth, e em seguida o código do app autenticador. Na primeira vez, o painel mostra o QR code para cadastrar o app. Sem cadastro aberto: editores são criados por um script de administração, e só quem está na lista de editores entra.
- **Proteção**: toda página e ação do painel exige sessão com segundo fator verificado e editor ativo; senão, volta ao login.
- **Fila** em `/painel`: votações relevantes das duas casas sem resumo publicado, da mais recente para a mais antiga, com os critérios.
- **Edição** em `/painel/votacoes/<id>`: texto do resumo (guardado como rascunho, com versão), aprovação que publica (registra quem e quando), e curadoria: incluir no feed com justificativa pública, ou retirar.
- **Trilha de auditoria**: cada rascunho, aprovação e curadoria fica registrado com editor, data, versão e texto.
- **Publicação**: o site lê só os resumos aprovados, por uma visão; o perfil mostra o resumo aprovado na votação, com "Resumo revisado por pessoas em dd/mm/aaaa".
- **Banco**: papel `cobra_editor`, que só lê o necessário e só grava nas tabelas editoriais; rascunhos não ficam visíveis ao papel do site.

## Fora de escopo

- Rascunho por IA (change `rascunho-ia`), resumos de projetos, perfis de acesso além de "editor", limite de curadorias.

## Capabilities

### New Capabilities
- `painel-editorial`: login com segundo fator, fila, edição, aprovação, curadoria e auditoria.

### Modified Capabilities
- (nenhuma)

## Impact

- `supabase/config.toml` (TOTP ligado, cadastro por e-mail desligado); migração com o schema `editorial` (editores, resumos, log), visão `core.published_summaries` e papel `cobra_editor`.
- `web`: `@supabase/ssr` 0.12.7 e `@supabase/supabase-js` 2.117.3; páginas `/painel/**`, Proxy, ações de servidor; script `add-editor.mjs`; variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EDITOR_DATABASE_URL` e `SUPABASE_SECRET_KEY` (só no script).
- Testes Playwright do login com TOTP (`otpauth` 9.5.2 só em teste).
