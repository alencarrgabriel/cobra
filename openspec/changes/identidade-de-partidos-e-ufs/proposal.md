# Proposal

## Why

O DDR pede que todo político apareça com a cor e a sigla do seu partido e a bandeira da sua UF, com a mesma regra para todos (RF-09, RF-32, §9.1). Os partidos e os 35 representantes do DF já estão no banco, mas sem cor; e o site não tem as bandeiras. As telas de representantes (`busca-geografica`, `perfil-do-politico`) precisam dessas peças prontas.

## What Changes

- Cores de partido, numa tabela curada pelo Cobra (`core.party_colors`), uma cor por sigla para os partidos em atividade. O TSE não define cores oficiais (DDR §6.1).
  - Cada cor registra em que se baseou: `theme-color` do site oficial do partido, cor dominante no CSS do site oficial, ou identidade conhecida ainda a confirmar.
  - Consulta feita nos sites oficiais em 2026-10-26.
- Bandeiras das 27 UFs em SVG, servidas pelo próprio site, cada uma com a origem e a licença registradas:
  - Wikimedia Commons, domínio público;
  - os governos estaduais não publicam o arquivo vetorial.
- No site:
  - componente `UfFlag` (bandeira com texto alternativo);
  - leitura das cores de partido do banco, com cor neutra do design system para partido sem cor curada;
  - catálogo `/design` mostrando as bandeiras.
- Testes:
  - toda cor curada tem formato válido;
  - toda cor curada atinge contraste AA no selo;
  - as 27 bandeiras existem e não contêm script.

Requisitos do DDR cobertos: RF-09, RF-32 (cor, sigla e bandeira; logotipo fica para depois), §9.1 (mesma regra para todos), §6.1 (bandeiras e cores de partido), RNF-13 (contraste).

Fora de escopo:
- Logotipos de partidos: o DDR pede confirmação no parecer jurídico antes de usar (§10, checklist). O selo continua só com cor e sigla.
- Telas de representantes (`busca-geografica`).
- Cores de partidos extintos.

## Capabilities

### New Capabilities

- `identidade-de-partidos-e-ufs`: de onde vêm e como são guardadas as cores de partido e as bandeiras das UFs, e como o site as usa.

### Modified Capabilities

(nenhuma: o requisito "Identidade de partido igual para todos" de `identidade-visual` continua valendo como está; esta change fornece os dados.)

## Impact

- Migração nova: tabela `core.party_colors` com as cores e a procedência de cada uma.
- `web/public/bandeiras/<UF>.svg` (27 arquivos, cerca de 1,6 MB no total; cada página carrega só as que mostra) e `web/src/lib/geo/flags.json` com origem, licença e hash.
- `web/src/lib/parties.ts`, `web/src/components/UfFlag/`.
- `docs/modelo-de-dados.md` com a tabela nova.
