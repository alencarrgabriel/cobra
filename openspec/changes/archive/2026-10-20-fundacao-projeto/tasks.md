# Tasks

## 1. Raiz do repositório e convenções

- [x] 1.1 Criar `.gitignore` (node_modules, `.next`, `.venv`, caches, `data/raw/`, `.env*` exceto `.env.example` e `.env.test`), `.gitattributes` (LF), `.editorconfig`, `.nvmrc` (24) e `.python-version` (3.13); verificar com `git check-ignore .env web/.env.local` listando os dois arquivos
- [x] 1.2 Criar `package.json` da raiz (engines Node 24, `packageManager` pnpm fixado, Supabase CLI como devDependency) e `pnpm-workspace.yaml` com `web`; verificar que `pnpm install` conclui e gera `pnpm-lock.yaml`
- [x] 1.3 Adicionar `LICENSE` com o texto oficial da AGPL-3.0; verificar que o GitHub reconheceria a licença (texto idêntico ao de gnu.org)
- [x] 1.4 Escrever `README.md` (o que é o Cobra, princípios de neutralidade, pré-requisitos, como rodar) e `CONTRIBUTING.md` (convenções de idioma, nomes, Conventional Commits, fluxo OpenSpec, comando `pnpm check`) em pt-BR; verificar que todo comando citado existe nos scripts

## 2. Site (web/)

- [x] 2.1 Criar o app Next.js 16 em `web/` com App Router, TypeScript strict, ESLint (flat config com regras do Next e `jsx-a11y`) e Prettier; verificar com `pnpm --filter web lint` e `pnpm --filter web typecheck` passando
- [x] 2.2 Implementar `web/src/config/env.ts` (Zod, separação server/public, erro só com nomes) e `.env.example` da raiz; adicionar testes Vitest: variável ausente gera erro com o nome, valor inválido não aparece na mensagem, todas as chaves do esquema existem no `.env.example`
- [x] 2.3 Criar layout raiz com `lang="pt-BR"`, viewport, metadados em português, página inicial mínima (nome e frase do produto, renderizada no servidor) e página 404 em linguagem simples; verificar com `pnpm --filter web build` sem erros
- [x] 2.4 Configurar cabeçalhos de segurança em `next.config.ts` conforme design D5; verificar com teste que inspeciona a resposta de `/` e `/api/health`
- [x] 2.5 Implementar `GET /api/health` (status, version, commit) sem importar cliente de banco; teste Vitest chamando o handler sem `DATABASE_URL`
- [x] 2.6 Adicionar utilitário de log JSON do servidor com nível por `LOG_LEVEL`; teste Vitest confirma formato e filtragem por nível
- [x] 2.7 Configurar Playwright (Chromium, viewport 360 px) com testes de `aplicacao-web-base`: `lang`, viewport sem rolagem horizontal, conteúdo sem JavaScript, cabeçalhos, 404; verificar com `pnpm --filter web test:e2e` passando

## 3. Coletores (collectors/)

- [x] 3.1 Criar pacote `cobra_collectors` com uv (`pyproject.toml`, `uv.lock`), configurar ruff, mypy strict e pytest com pytest-socket bloqueando rede; verificar com `uv run ruff check`, `uv run mypy .` e `uv run pytest` passando
- [x] 3.2 Implementar `cobra_collectors.config` com pydantic-settings (`APP_ENV`, `LOG_LEVEL`, `DATABASE_URL`); testes: variável ausente cita o nome, valor não aparece no erro, chaves batem com `.env.example`
- [x] 3.3 Configurar `structlog` (JSON em produção, legível em desenvolvimento); teste confirma saída JSON com `APP_ENV=production`
- [x] 3.4 Implementar CLI `cobra-collect` (Typer) com `check-config` e `sources`; testes com o runner do Typer: código de saída diferente de zero sem `DATABASE_URL`, `sources` lista vazia; e um teste confirma que tentativa de conexão externa falha nos testes

## 4. Banco local

- [x] 4.1 Rodar `supabase init` (via devDependency) gerando `supabase/config.toml` e `supabase/migrations/` vazia com `.gitkeep`; documentar no README `pnpm db:start` / `pnpm db:stop`; verificar que `pnpm db:start` sobe o Postgres local com Docker

## 5. Verificação contínua

- [x] 5.1 Criar scripts da raiz `check`, `check:web`, `check:collectors` e `check:secrets` (gitleaks via Docker); verificar que `pnpm check` roda lint, formatação, tipos e testes dos dois lados e termina com código zero
- [x] 5.2 Criar `.github/workflows/ci.yml` com jobs `web`, `collectors` e `secrets` (permissões `contents: read`, cache de pnpm, uv e navegadores do Playwright); verificar com `actionlint` sem erros
- [x] 5.3 Adicionar `.github/dependabot.yml` (npm, uv, github-actions, semanal); verificar YAML válido
- [x] 5.4 Provar que as verificações reprovam: num rascunho local, introduzir um erro de tipo em `web/`, um erro de ruff em `collectors/` e uma chave falsa de formato reconhecível; confirmar que `pnpm check` e `pnpm check:secrets` falham em cada caso; desfazer

## 6. Integração final

- [x] 6.1 Rodar `pnpm check` e `pnpm check:secrets` completos na árvore limpa e registrar a saída no resumo da change

## Workflow follow-up

- Revisar com o responsável e só então rodar `/opsx:archive`.
- Primeiro push para o GitHub (repositório público) e confirmar o CI verde.
