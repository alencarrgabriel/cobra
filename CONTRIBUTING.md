# Como contribuir

Obrigado pelo interesse! Antes de começar, leia os princípios no [README](README.md) e o [DDR](docs/ddr.md): eles valem para código, textos e dados.

## Fluxo de trabalho

Desenvolvemos com especificações primeiro, usando o [OpenSpec](https://github.com/Fission-AI/OpenSpec):

1. Toda mudança começa como uma *change* em `openspec/changes/<nome>/`, com proposta, design, specs e tarefas.
2. A change é revisada antes de qualquer código.
3. A implementação segue as tarefas; cada tarefa traz como verificar que está pronta.
4. Depois de revisada e com o CI verde, a change é arquivada e suas specs passam a valer em `openspec/specs/`.

O plano de changes da Fase 1 e o contexto do projeto estão em `openspec/config.yaml`.

## Convenções

### Idioma

| O quê | Idioma |
|---|---|
| Textos do site, e-mails e qualquer coisa que o usuário lê | Português do Brasil, linguagem simples |
| Artefatos do OpenSpec (proposta, design, specs, tarefas) | Português do Brasil |
| Código, nomes de variáveis, tabelas e colunas, logs e mensagens de erro técnicas | Inglês |
| Mensagens de commit | Inglês |

### Nomes

- Tabelas e colunas: `snake_case`, tabelas no plural (`politicians`, `votes`).
- Changes do OpenSpec: `kebab-case` em português (`ingestao-camara-deputados`).
- Variáveis de ambiente: `UPPER_SNAKE_CASE`, todas documentadas no `.env.example`.

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/) em inglês:

```
feat(web): add representatives page
fix(collectors): retry on HTTP 429 from Senado API
docs: describe relevance criteria
```

### Dados

- Toda entidade de dado público guarda a fonte, o identificador original e a data de coleta.
- Nunca chame APIs do governo a partir do site; isso é trabalho dos coletores.
- Antes de integrar uma API externa, confira a documentação oficial atual e registre no design da change o que foi confirmado e quando.

### Banco de dados

- O esquema muda só por migrações SQL em `supabase/migrations/`, com nome `<AAAAMMDDHHMMSS>_<descricao>.sql`.
- Nunca edite uma migração já aplicada em algum ambiente; corrija com uma migração nova.
- Tabelas e colunas em inglês, `snake_case`, tabelas no plural.
- Toda tabela de dado público segue a convenção de rastreabilidade de [docs/modelo-de-dados.md](docs/modelo-de-dados.md).
- Migrações nunca têm senha nem criam papel com login.

### Segredos

- Nada de credenciais no repositório. Configuração vai em variáveis de ambiente, documentadas no `.env.example`.
- O `.env` local é ignorado pelo git. O `.env.test` tem apenas valores falsos para os testes.
- Só variáveis com prefixo `NEXT_PUBLIC_` podem chegar ao navegador.

## Verificações

O CI roda as mesmas verificações que você pode rodar localmente:

| Comando | O que faz |
|---|---|
| `pnpm check` | Tudo abaixo, menos a varredura de segredos (precisa do banco local: `pnpm db:start`) |
| `pnpm check:web` | Lint, formatação, tipos, testes de unidade, build, checagem do bundle e testes de navegador do site |
| `pnpm check:collectors` | Lint, formatação, tipos e testes dos coletores |
| `pnpm check:db` | Aplica as migrações num banco descartável e roda os testes de banco |
| `pnpm check:secrets` | Procura credenciais expostas com o gitleaks (precisa de Docker) |

Os testes de navegador usam o Playwright. Na primeira vez, instale o navegador com `pnpm --filter web exec playwright install chromium`.

Os testes dos coletores não podem acessar a internet: use respostas gravadas das APIs.

Para corrigir formatação automaticamente: `pnpm --filter web format` e `uv run --directory collectors ruff format .`.
