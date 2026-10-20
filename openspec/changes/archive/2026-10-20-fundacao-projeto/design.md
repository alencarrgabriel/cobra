# Design

## Context

Repositório vazio, exceto `docs/ddr.md` e a configuração do OpenSpec. A stack vem do DDR (cap. 8) e de `openspec/config.yaml`. O repositório será público no GitHub, então tudo precisa funcionar para um voluntário com Windows, macOS ou Linux, sem segredos no repositório. Motivação: ver proposal.md.

Ambiente verificado em 2026-10-20: Next.js 16.4.2 é a versão estável no npm; Supabase CLI 2.121.0; uv 0.11; Python 3.13 instalado; a máquina local tem Node 22.16.

## Goals / Non-Goals

**Goals:**
- Estrutura de pastas estável, que as próximas 21 changes só preenchem.
- Um único comando local (`pnpm check`) que reproduz o CI.
- Padrões de configuração e de testes que as próximas changes copiam.

**Non-Goals:**
- Nenhuma tabela, migração ou acesso ao banco (o Supabase local é só inicializado).
- Nenhum deploy, domínio ou CDN configurados; a escolha da hospedagem fica para quando houver página com dados.
- Sem Sentry, sem autenticação, sem design system visual (só estilos mínimos).

## Decisions

### D1. Monorepo com workspace pnpm na raiz
```
/
├── web/                 Next.js (App Router) + TypeScript
├── collectors/          pacote Python "cobra_collectors" (uv)
├── supabase/            config.toml + migrations/ (vazia)
├── docs/                ddr.md e documentação técnica
├── openspec/
├── .github/workflows/   ci.yml
├── package.json         scripts que orquestram tudo (check, lint, test...)
├── pnpm-workspace.yaml  pacote: web
└── .env.example
```
O `package.json` da raiz traz o Supabase CLI como dependência de desenvolvimento (sem instalação global) e scripts que chamam `uv run` dentro de `collectors/`. Scripts npm funcionam igual em Windows e Unix, ao contrário de Makefile.
- Alternativa: `apps/` + `packages/` com Turborepo. Rejeitada: há uma só aplicação Node; o DDR pede separar serviços só quando o volume exigir.
- Alternativa: pastas independentes sem workspace na raiz. Rejeitada: perde o comando único `pnpm check`.

### D2. Versões fixadas
- Node.js 24 LTS (`.nvmrc` e `engines`); pnpm via corepack, versão fixada em `packageManager`. Node 22 entra em fim de suporte em abril de 2027, durante a Fase 2.
- Next.js 16 (estável mais recente no momento da implementação, fixada pelo lockfile), React correspondente, TypeScript em modo `strict`.
- Python 3.13 (`.python-version`), gerenciado pelo uv com `uv.lock` versionado.

### D3. Ferramentas de qualidade
| Função | Site | Coletores |
|---|---|---|
| Lint | ESLint (flat config, regras do Next e de acessibilidade `jsx-a11y`) | ruff |
| Formatação | Prettier | ruff format |
| Tipos | `tsc --noEmit` | mypy (modo strict) |
| Testes | Vitest (unidade), Playwright (navegador, Chromium com viewport de 360 px) | pytest + pytest-socket (bloqueia rede) |
- Alternativa: Biome no lugar de ESLint + Prettier. Rejeitada por ora: o plugin de acessibilidade do ESLint ajuda a cumprir o RNF-13 (WCAG AA).
- Alternativa: pyright no lugar do mypy. Equivalentes; mypy roda sem Node no lado Python.

### D4. Configuração: um esquema por lado, que também gera a checagem do `.env.example`
- Site: `web/src/config/env.ts` define as variáveis com Zod, separando `server` e `public` (só `NEXT_PUBLIC_*`). Lido na partida; erro lista os nomes inválidos, nunca os valores. Arquivos de servidor importam `server-only` para impedir que credenciais cheguem ao navegador.
- Coletores: `cobra_collectors.config` com pydantic-settings; o CLI valida antes de qualquer trabalho.
- Um teste de cada lado compara as variáveis declaradas no esquema com as chaves do `.env.example` e falha se alguma faltar. Assim o requisito "variável nova sem documentação" vira teste comum, sem varredura frágil do código.
- Nesta change as únicas variáveis são `APP_ENV` (development/test/production), `LOG_LEVEL` e `DATABASE_URL` (declarada, obrigatória só nos coletores; usada a partir da próxima change). Para os testes, `.env.test` com valores falsos fica versionado.

### D5. Cabeçalhos de segurança via `next.config.ts`
Os cabeçalhos estáticos (HSTS de 2 anos com `includeSubDomains`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` restritiva, CSP) são definidos em `headers()` para todas as rotas.
CSP inicial: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'` (com `'unsafe-eval'` só em desenvolvimento).
- Alternativa: CSP com nonce por requisição. Rejeitada por ora: obriga renderização dinâmica de toda página e impede cache na CDN, contra o RNF-08 (picos de 10x). Reavaliar quando houver conteúdo de terceiros.

### D6. Rota de saúde estática
`/api/health` devolve `{ status: "ok", version, commit }`, com `version` do `package.json` e `commit` de `APP_COMMIT_SHA` (opcional). Não importa nenhum cliente de banco. Um teste roda a rota sem `DATABASE_URL` e sem rede. Quando houver banco, um endpoint separado poderá checá-lo; esta rota continua indicando só que o site responde.

### D7. Logs estruturados desde o início
Coletores usam `structlog` com saída JSON em produção e legível em desenvolvimento, nível por `LOG_LEVEL`. No site, um utilitário mínimo de log JSON no servidor. É a base do RNF-17; Sentry entra em `saude-integracoes`.

### D8. CLI dos coletores
`cobra-collect` (entry point do pacote, com Typer) tem dois comandos: `check-config` (valida e diz "configuração válida") e `sources` (lista adaptadores registrados; vazio por ora). O registro de adaptadores é uma lista simples nesta change; a interface real do adaptador nasce em `infra-coleta`.

### D9. CI no GitHub Actions
`ci.yml` com três jobs paralelos, disparados em push e pull request:
1. `web`: setup Node pela `.nvmrc` → `pnpm install --frozen-lockfile` → lint → format check → typecheck → Vitest → `next build` → Playwright.
2. `collectors`: setup uv → `uv sync --locked` → ruff check → ruff format --check → mypy → pytest.
3. `secrets`: gitleaks sobre todo o histórico do push. Localmente roda pela imagem Docker oficial (`pnpm check:secrets`).
Dependabot semanal para npm, uv e GitHub Actions. Permissões do workflow: `contents: read`.

### D10. Idioma e convenções registrados no `CONTRIBUTING.md`
Interface em pt-BR; código, tabelas, logs e commits em inglês; Conventional Commits; artefatos OpenSpec em pt-BR. O `README.md` em pt-BR explica o projeto, os princípios de neutralidade e como rodar localmente.

## Risks / Trade-offs

- [CSP com `'unsafe-inline'` em scripts é mais fraca] → Sem conteúdo de usuário nem terceiros nesta fase; reavaliar com nonce/hash na change do painel editorial, que terá login.
- [Contribuidores no Windows com Node 22] → `engines` e `.nvmrc` deixam o erro explícito; o README traz o passo de atualização.
- [gitleaks local depende de Docker] → Docker já é necessário para o Supabase local; o CI roda de qualquer forma.
- [Playwright deixa o CI mais lento] → Só Chromium e só as páginas principais; cache dos navegadores no CI.
- [Licença AGPL-3.0 afasta parte dos contribuidores corporativos] → Decisão consciente: impede que alguém rode uma versão fechada do serviço; dados e textos podem ter licença própria depois.

## Migration Plan

Não há sistema em produção. Rollback: reverter os commits da change.

## Open Questions

- Hospedagem do site (Vercel ou Cloudflare) e uso comercial do plano gratuito: decidir na primeira change com página pública de dados; não afeta esta estrutura.
