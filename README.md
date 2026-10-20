# Cobra

> Nome provisório.

Plataforma cívica que mostra a qualquer brasileiro, a partir de onde ele mora, o que fazem os políticos que o representam: como votam, o que propõem, se comparecem, quanto gastam, que patrimônio declaram e quem doou para suas campanhas.

O projeto está no início. Ainda não há dados no site; o plano completo está no [Documento de Definição de Requisitos](docs/ddr.md).

## Princípios

- **Fatos, nunca opinião.** Nenhuma nota, ranking, adjetivo de valor ou ordenação por "desempenho".
- **Fonte e data em tudo.** Todo dado exibido mostra a fonte oficial e quando foi atualizado.
- **Banco próprio.** O site nunca consulta as APIs do governo em tempo real; coletores copiam os dados oficiais, respeitando os limites de cada fonte.
- **Revisão humana.** Resumos podem ser rascunhados por IA, mas só são publicados depois de aprovados por uma pessoa, com registro de quem aprovou.
- **Privacidade.** Uso sem cadastro. Quem você segue revela opinião política: só guardamos com consentimento específico e de forma criptografada.
- **Código aberto**, sob a licença [AGPL-3.0](LICENSE).

## Estrutura

| Pasta | O que tem |
|---|---|
| `web/` | Site em Next.js e TypeScript |
| `collectors/` | Coletores de dados em Python |
| `supabase/` | Configuração do banco local e migrações |
| `docs/` | DDR e documentação técnica |
| `openspec/` | Especificações e mudanças planejadas ([OpenSpec](https://github.com/Fission-AI/OpenSpec)) |

## Como rodar localmente

Pré-requisitos:

- [Node.js 24 LTS](https://nodejs.org/) e [pnpm](https://pnpm.io/) (`npm install -g pnpm` ou `corepack enable`)
- [uv](https://docs.astral.sh/uv/), que instala o Python 3.13 sozinho
- [Docker](https://www.docker.com/), para o banco local e a varredura de segredos

Passos:

```bash
pnpm install                     # dependências do site
uv sync --directory collectors   # dependências dos coletores
cp .env.example .env             # configuração local (edite se precisar)

pnpm db:start                    # sobe o Postgres local (Supabase)
pnpm --filter web dev            # site em http://localhost:3000
uv run --directory collectors cobra-collect check-config

pnpm db:stop                     # desliga o banco local
```

Para verificar tudo antes de enviar uma contribuição, rode `pnpm check` (veja o [CONTRIBUTING.md](CONTRIBUTING.md)).
