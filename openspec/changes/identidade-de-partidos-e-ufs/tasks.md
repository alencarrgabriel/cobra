# Tasks

## 1. Dados

- [x] 1.1 Migração `core.party_colors` com as cores curadas e a procedência (D1, D2); teste pytest com banco: formato, base válida, `source_url` presente; `docs/modelo-de-dados.md`
- [x] 1.2 Baixar as 27 bandeiras do Commons para `web/public/bandeiras/` e registrar `web/src/lib/geo/flags.json` (D4)

## 2. Site

- [x] 2.1 `web/src/lib/parties.ts` (`getPartyColors`, `partyColor` com cor neutra) e `UfFlag`; testes Vitest: contraste AA de todas as cores da migração, cor neutra para sigla desconhecida, texto alternativo, 27 bandeiras com hash igual e sem script
- [x] 2.2 Catálogo `/design` com as bandeiras e selos de exemplo; axe nos dois temas; `pnpm check` e `pnpm check:secrets`

## Workflow follow-up

- Revisar e arquivar a change.
