# Painel editorial

Área do site (`/painel`) onde editores escrevem, aprovam e publicam os resumos das votações relevantes e fazem a curadoria do feed (change `painel-editorial`; DDR RF-62, RF-63, RNF-11).

## Quem entra

- Só editores criados por administração: o cadastro aberto está desligado (`[auth] enable_signup = false` em `supabase/config.toml`).
- Login com e-mail e senha do Supabase Auth e, em seguida, o código de um app autenticador (TOTP). No primeiro acesso o painel mostra o QR code para cadastrar o app.
- Além disso, o e-mail precisa estar ativo em `editorial.editors`. Toda página e ação confere isso; o Proxy só renova a sessão e manda para a etapa que falta.

## Criar um editor

```sh
cd web
node scripts/add-editor.mjs editora@exemplo.org "Nome da Editora"
```

O script usa `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `DATABASE_URL` do `.env` da raiz, cria o usuário com uma senha aleatória (mostrada uma única vez) e inclui o e-mail na lista de editores. Para desativar: `update editorial.editors set active = false where email = '...'`.

## Fluxo

1. A fila mostra as votações relevantes (critérios do DDR §9.2) sem resumo publicado.
2. "Salvar rascunho" grava uma nova versão; rascunhos nunca aparecem no site.
3. "Aprovar e publicar" registra quem aprovou e quando; a versão publicada anterior vira "substituída".
4. A curadoria inclui uma votação no feed com justificativa pública (ao menos 20 caracteres) ou retira a inclusão.
5. Tudo vai para `editorial.log`, que o painel só consegue acrescentar, nunca alterar ou apagar.

## Banco

- Schema `editorial` (editores, versões de resumo, log): o papel do site (`cobra_web_reader`) não tem acesso; ele lê só `core.published_summaries`.
- Papel `cobra_editor` (conexão `EDITOR_DATABASE_URL`): lê `core` e grava só resumos, log e curadoria.
