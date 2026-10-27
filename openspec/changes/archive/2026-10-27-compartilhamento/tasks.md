# Tasks

## 1. Cards

- [x] 1.1 `SITE_URL` no esquema de ambiente, `.env.example` e `metadataBase` (D5); fontes em `web/assets/fonts` com licença (D2)
- [x] 1.2 `lib/cards`: conteúdo de cada card (funções puras, D3), layout único (D2), foto com tempo limite (D4); testes Vitest
- [x] 1.3 Rotas `/cartao/{politico,representantes,obra}/<id>/<formato>` com 404, 503 e cache (D1)

## 2. Prévia e painel

- [x] 2.1 `generateMetadata` com Open Graph e X no perfil, em representantes e na obra (D5)
- [x] 2.2 `SharePanel` com abas de formato e as seis ações (D6), nas três páginas; testes Vitest das URLs

## 3. Testes e integração

- [x] 3.1 Testes Playwright (D7), axe com o painel aberto
- [x] 3.2 Conferir os cards com dados reais nos três formatos; `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
