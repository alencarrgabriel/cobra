# Design

## Context

- `PartyBadge` (change `identidade-visual`) já garante contraste AA: escolhe a cor do texto e, se nenhuma servir, escurece o fundo (`web/src/lib/contrast.ts`).
- `core.parties` tem 35 partidos, vindos da Câmara, do Senado e da CLDF, incluindo extintos (PFL, DEM, PSL…).
- O DDR §6.1 diz que cores e logotipos de partido são "tabela curada pelo Cobra a partir da identidade publicada por cada partido" e que as bandeiras vêm de "arquivos vetoriais de fontes oficiais", registrando a origem.

Pesquisa de 2026-10-26:
- Sites oficiais de 20 partidos em atividade. Cinco declaram `theme-color`: PSB, PSD, PODE, PRD e SOLIDARIEDADE. Nos outros, a cor saturada mais frequente no próprio HTML, descontadas as cores padrão do WordPress (`#003388`, `#cf2e2e`, `#ff6900`, `#fcb900`, `#00d084`, `#0693e3`), confirma a identidade de PL, MDB, PSDB, PSOL, CIDADANIA, AVANTE e PCdoB. Para PT, PP, UNIÃO, REPUBLICANOS, PDT, NOVO, PV e REDE a página não ajudou (cores de modelo ou página vazia).
- Bandeiras: os governos estaduais não publicam SVG. O Wikimedia Commons tem as 27, todas marcadas como domínio público (símbolos oficiais definidos em lei).

## Goals / Non-Goals

**Goals:** cor por partido com procedência, contraste garantido, bandeiras servidas pelo Cobra com origem e licença.

**Non-Goals:** logotipos (aguardam parecer jurídico), cores de partidos extintos, telas de representantes.

## Decisions

### D1. Tabela `core.party_colors`
- Uma linha por sigla. Colunas:
  - `acronym` (chave);
  - `color` (hexadecimal de 6 dígitos);
  - `basis`: `theme_color` (declarada no site), `site_css` (dominante no site) ou `known_identity` (identidade conhecida, a confirmar);
  - colunas de procedência: `source = 'cobra'`, `source_id` = sigla, `source_url` = site oficial consultado, `collected_at` = data da consulta.
- Ligada a `core.parties` pela sigla, não por chave estrangeira: um partido criado depois por qualquer coletor já encontra a sua cor.
- Carregada na migração. Mudar uma cor é uma migração nova, revisável no código.
- Partidos em atividade sem cor confiável (AGIR, DC, MISSÃO, MOBILIZA, PCB, PCO, PMB, PSTU, UP) ficam fora e usam a cor neutra (D3).

### D2. Cores escolhidas
Cada uma com a sua base. Por exemplo:
- PSB `#c41d23` (theme_color);
- PSOL `#ffc200` (site_css);
- PT `#c8102e` (known_identity).

A lista completa está na migração. Partidos com cores parecidas (vários vermelhos e azuis) continuam distinguíveis pela sigla, que sempre aparece. A cor nunca identifica o partido sozinha.

### D3. Cor neutra
`#6f706a`, a mesma cor de "situação neutra" do tema claro (`--work-idle`), fixa em hexadecimal porque o cálculo de contraste do selo precisa de uma cor concreta.

### D4. Bandeiras
- `web/public/bandeiras/<UF>.svg`, baixadas uma vez do Commons e versionadas.
- `web/src/lib/geo/flags.json` registra, por UF: nome, título do arquivo no Commons, página de descrição, licença, SHA-256 e data da consulta.
- Teste: 27 arquivos, hash igual ao registrado, nenhum `<script` nem atributo `on…=` (os SVG são servidos como imagem, mas a checagem evita surpresas se forem embutidos um dia).
- `UfFlag` usa `<img>` com largura e altura fixas, proporção 7:10 dentro de uma caixa, texto alternativo "Bandeira de/do/da <UF>" com a preposição certa, e `loading="lazy"`.
- Sete arquivos passam de 100 KB (RJ, AL, RS, PR, RN…). Como cada card carrega só a sua bandeira, ficam como estão. Otimizar os SVG fica para quando houver cards de todas as UFs.

### D5. Leitura no site
- `web/src/lib/parties.ts`:
  - `getPartyColors()` (`'use cache'`, `cacheLife('days')`) devolve um mapa sigla → cor, pelo mesmo padrão de erro de `works/queries.ts`;
  - `partyColor(map, sigla)` devolve a cor ou a neutra.
- As telas que mostram políticos (próximas changes) usam essas duas funções com o `PartyBadge`.

### D6. Testes
- Banco (pytest): tabela carregada; todas as cores no formato; a base é uma das três; toda cor tem `source_url`.
- Site (Vitest):
  - para cada cor da migração, o selo gerado tem contraste AA;
  - `partyColor` usa a neutra para sigla desconhecida;
  - `UfFlag` com o texto alternativo certo;
  - as 27 bandeiras conferidas contra `flags.json`.
- Navegador: `/design` sem violações de acessibilidade nos dois temas, com as bandeiras.

## Risks / Trade-offs

- [Cor "conhecida" diferente da preferida pelo partido] → A base fica registrada como `known_identity`, e qualquer partido pode pedir correção pelo canal de reporte (`metodologia-e-reporte-de-erro`).
- [Dois partidos com cores parecidas] → A sigla sempre aparece; a cor ajuda, não identifica sozinha.
- [Commons não é fonte oficial] → Licença e página de cada arquivo registradas. Se um governo estadual publicar o vetor oficial, troca-se o arquivo e o hash.

## Migration Plan

Migração nova com a tabela e os dados. Não altera tabelas existentes.
