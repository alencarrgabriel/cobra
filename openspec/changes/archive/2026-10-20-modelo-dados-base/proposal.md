# Proposal

## Why

Toda ingestão e toda página do Cobra giram em torno de uma pergunta: quem representa cada lugar, por qual partido, e com que fonte. O banco ainda está vazio. Antes de coletar qualquer dado, precisamos do núcleo do modelo do DDR (cap. 7): localidades, casas legislativas, partidos, políticos com identidade única entre as fontes, filiações e mandatos. Também precisamos das regras que valem para todas as tabelas futuras: rastreabilidade (RNF-16) e acesso mínimo, com o site só lendo.

## What Changes

- Primeira migração SQL versionada em `supabase/migrations/`, com:
  - esquema `core` para os dados públicos normalizados que o site lê, fora da API automática do Supabase;
  - tabelas `localities`, `legislative_houses`, `parties`, `politicians`, `politician_external_ids`, `politician_private_ids`, `party_affiliations` e `mandates`;
  - colunas de rastreabilidade em toda tabela de dado público: fonte, identificador original, link de origem, data de coleta e data de atualização na fonte;
  - restrições de integridade: identificador externo único por sistema, datas coerentes, no máximo uma filiação aberta por político, mandatos sem sobreposição no mesmo cargo;
  - papéis `cobra_web_reader` (só leitura) e `cobra_collector` (leitura e escrita);
  - carga fixa das 27 UFs (códigos IBGE) e das 3 casas legislativas do MVP (Câmara, Senado, CLDF).
- Testes de banco com pytest contra um Postgres real, num banco descartável criado a cada execução.
- Job novo no CI com um Postgres 17 de serviço, rodando migrações e testes de banco.
- Documentação do modelo em `docs/modelo-de-dados.md`.

**Mudança no plano aprovado:** as tabelas de proposições, votações, presença, despesas e TSE saem desta change e entram nas changes de ingestão que as usam (9 a 14). Cada uma será desenhada depois de conferir a documentação atual da API correspondente.

Requisitos do DDR cobertos: RNF-16 (rastreabilidade), RNF-10 (acesso mínimo; base), RF-06 (CLDF como casa distrital do DF, base de dados), RF-27 (histórico de partidos e cargos, base de dados), §6.2 (identidade única de político), §7 (entidades Localidade, Político, IdentificadorExterno, Partido, Filiação, Mandato, CasaLegislativa), §10.1 (dados de políticos: CPF fora do alcance do site).

Fora de escopo: municípios (change `busca-geografica`), camada bruta e fila (change `infra-coleta`), qualquer coleta, páginas, tabelas de usuários e tabelas editoriais.

## Capabilities

### New Capabilities

- `cadastro-de-representantes`: o que o banco guarda sobre localidades, casas legislativas, partidos, políticos, identidades entre fontes, filiações e mandatos, e as regras de integridade desses dados.
- `rastreabilidade-de-dados`: toda linha de dado público guarda a fonte oficial, o identificador original e as datas de coleta e de atualização na fonte.
- `acesso-ao-banco`: quem pode ler e escrever o quê no banco; o site só lê, e dados restritos de políticos ficam fora do alcance do site.

### Modified Capabilities

- `verificacao-continua`: passa a exigir migrações e testes de banco em cada contribuição.

## Impact

- Novos: `supabase/migrations/<timestamp>_core_base.sql`, `collectors/tests/db/`, `docs/modelo-de-dados.md`.
- Alterados: `.github/workflows/ci.yml` (job `database`), `package.json` da raiz (`check:db`, incluído em `pnpm check`), `collectors/pyproject.toml` (psycopg, marcador `db`, liberação de rede só para o banco local nos testes), `CONTRIBUTING.md` (convenções de banco).
- `pnpm check` passa a exigir Docker com o Supabase local rodando (`pnpm db:start`).
- Nenhuma mudança visível no site.
