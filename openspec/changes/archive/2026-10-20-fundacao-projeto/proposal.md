# Proposal

## Why

O repositório ainda não tem código, estrutura nem verificação automática. Todas as 21 changes seguintes da Fase 1 dependem de uma base comum: onde fica cada parte (site, coletores, banco), como se configura sem segredos no repositório e como cada contribuição é verificada antes de entrar. Fazer isso primeiro, e pequeno, evita que cada change reinvente ferramentas.

## What Changes

- Monorepo com três partes: `web/` (Next.js + TypeScript, renderização no servidor), `collectors/` (Python gerenciado com uv) e `supabase/` (configuração local e pasta de migrações, ainda vazia).
- Página inicial mínima em pt-BR, mobile first, que só confirma que o site está no ar (sem dados ainda).
- Rota de saúde `/api/health` que responde sem consultar banco nem APIs externas.
- Cabeçalhos de segurança no site (HSTS, CSP básica, bloqueio de iframe, `nosniff`, `Referrer-Policy`).
- Configuração por variáveis de ambiente, com `.env.example` documentado e validação na inicialização (falha com mensagem clara, sem expor valores).
- Esqueleto dos coletores: pacote Python com comando de linha `cobra-collect` que valida a configuração e lista as fontes (nenhuma ainda).
- Lint, formatação, checagem de tipos e testes nas duas linguagens (ESLint, Prettier, Vitest, Playwright; ruff, mypy, pytest).
- CI no GitHub Actions rodando tudo isso em cada push e pull request, mais varredura de segredos.
- `LICENSE` (AGPL-3.0), `README.md` e `CONTRIBUTING.md` em pt-BR, com as convenções de idioma, nomes e commits.
- `.gitignore` cobrindo `.env*` (exceto `.env.example`), artefatos de build e dados brutos baixados.

Requisitos do DDR cobertos: RNF-15 (mobile first; base), RNF-18 (código aberto), RNF-10 (HTTPS obrigatório via HSTS; base), RNF-17 (logs estruturados; base), RNF-04 (site sem dependência em tempo real de APIs do governo; a rota de saúde é o primeiro exemplo).

Fora de escopo: tabelas e migrações reais (change `modelo-dados-base`), fila e limites de coleta (`infra-coleta`), Sentry e painel de saúde das integrações (`saude-integracoes`), deploy em produção e domínio (decidido quando houver página com dados), autenticação.

## Capabilities

### New Capabilities

- `aplicacao-web-base`: comportamento base de qualquer página e rota do site: idioma pt-BR, layout mobile first, cabeçalhos de segurança e rota de saúde que não depende de serviços externos.
- `configuracao-e-segredos`: como site e coletores recebem configuração: só por variáveis de ambiente documentadas, validação na partida, nenhum segredo versionado.
- `verificacao-continua`: verificações automáticas que toda contribuição precisa passar (lint, tipos, testes das duas linguagens, varredura de segredos).

### Modified Capabilities

(nenhuma; não há specs existentes)

## Impact

- Código novo: `web/`, `collectors/`, `supabase/`, `.github/workflows/`, arquivos da raiz (`package.json`, `pnpm-workspace.yaml`, `.env.example`, `.gitignore`, `.nvmrc`, `LICENSE`, `README.md`, `CONTRIBUTING.md`).
- Ferramentas exigidas de quem contribui: Node.js 24 LTS com pnpm (via corepack), uv (que instala o Python 3.13), Docker (para o Supabase local, usado a partir da próxima change).
- A máquina atual tem Node 22; será preciso atualizar para Node 24 LTS.
- Sem impacto em usuários: não há dados nem funcionalidades públicas ainda.
